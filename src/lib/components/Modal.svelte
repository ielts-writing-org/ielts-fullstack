<script lang="ts" module>
	type Config<S extends Snippet<[Parameters<S>[0]]>> = {
		children?: S;
		childrenProps?: S extends Snippet<infer P> ? P[0] : never;
		content?: string;
		primaryButton: ConfigButton;
		secondaryButton?: ConfigButton;
		title:
			string | { color: "default" | "primary" | "error" | "success" | "warning"; text: string };
	};

	type ConfigButton =
		| string
		| {
				action?: () => Promise<unknown> | unknown;
				color?: "default" | "error" | "primary" | "success" | "warning";
				explicitClose?: boolean;
				style?: "default" | "ghost" | "outline";
				text: string;
		  };

	let current = $state<Config<Snippet<[unknown]>>>();
	const queue = $state<Config<Snippet<[unknown]>>[]>([]);

	export let openModal: <S extends Snippet<[Parameters<S>[0]]>>(config: Config<S>) => void;
	export let closeModal: () => void;

	function registerModal(open: typeof openModal, close: typeof closeModal) {
		openModal = open;
		closeModal = close;
	}
</script>

<script lang="ts">
	import { onMount, type Snippet } from "svelte";

	import { waitForTransition } from "#lib/utils/dom.ts";

	let modal = $state<HTMLDialogElement>();

	const open = (config: Config<Snippet<[unknown]>>) => {
		queue.push(config);
		internalOpen();
	};

	const internalOpen = () => {
		if (!modal) throw new Error("Modal is missing");

		if (modal.open) return;

		const next = queue.shift();
		if (!next) return;

		current = next;
		modal.showModal();
	};

	const close = async () => {
		if (!modal) throw new Error("Modal is missing");

		modal.requestClose();
		await waitForTransition(modal);

		current = undefined;
		internalOpen();
	};

	onMount(() => {
		registerModal(open, close);

		if (queue.length) internalOpen();
	});
</script>

<dialog class="modal" bind:this={modal}>
	{#if current}
		<div class="modal-box">
			{@render titleSnippet(current.title)}
			{#if current.content}
				<p class="py-4">{current.content}</p>
			{/if}
			{@render current.children?.(current.childrenProps)}
			<div class="modal-action">
				{@render actionButtonSnippet(current.primaryButton)}
				{#if current.secondaryButton}
					{@render actionButtonSnippet(current.secondaryButton)}
				{/if}
			</div>
		</div>
	{/if}
</dialog>

{#snippet titleSnippet(title: Config<Snippet>["title"])}
	{#if typeof title === "string"}
		<h3 class="text-lg font-semibold">{title}</h3>
	{:else}
		<h3
			class={[
				"text-lg font-semibold",
				title.color === "primary" && "text-primary",
				title.color === "success" && "text-success",
				title.color === "warning" && "text-warning",
				title.color === "error" && "text-error"
			]}>
			{title.text}
		</h3>
	{/if}
{/snippet}

{#snippet actionButtonSnippet(source: ConfigButton)}
	{#if typeof source === "string"}
		<button class="btn" onclick={close}>{source}</button>
	{:else}
		<button
			class={[
				"btn",
				source.color === "primary" && "btn-primary",
				source.color === "success" && "btn-success",
				source.color === "warning" && "btn-warning",
				source.color === "error" && "btn-error",
				source.style === "ghost" && "btn-ghost",
				source.style === "outline" && "btn-outline"
			]}
			onclick={async () => {
				await source.action?.();
				if (!source.explicitClose) close();
			}}>
			{source.text}
		</button>
	{/if}
{/snippet}
