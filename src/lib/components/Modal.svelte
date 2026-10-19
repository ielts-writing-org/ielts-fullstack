<script lang="ts" module>
	import { type Snippet } from "svelte";
	import { waitForTransition } from "#lib/utils/dom.ts";

	type SnippetArgs<T> = T extends Snippet<infer P> ? P : never;
	type SnippetFirstArg<T> = SnippetArgs<T> extends [] ? never : SnippetArgs<T>[0];
	type SnippetWithFirstArg<T> = Snippet<[SnippetFirstArg<T>]>;
	type GenericSnippet = Snippet<[unknown]>;

	type ModalConfig<SContent extends SnippetWithFirstArg<SContent>> = {
		title:
			string | { text: string; color: "default" | "primary" | "success" | "warning" | "error" };
		content?:
			| string
			| (SnippetFirstArg<SContent> extends never
					? { snippet: SContent }
					: { snippet: SContent; args: SnippetFirstArg<SContent> });
		primaryButton: ModalConfigButton;
		secondaryButton?: ModalConfigButton;
	};

	type ModalConfigButton =
		| string
		| {
				text: string;
				action?: () => unknown | Promise<unknown>;
				color?: "default" | "primary" | "success" | "warning" | "error";
				style?: "default" | "outline" | "ghost";
				explicitClose?: boolean;
		  };

	const queue = $state<ModalConfig<GenericSnippet>[]>([]);
	let current = $state<ModalConfig<GenericSnippet>>();
	let modal = $state<HTMLDialogElement>();

	export function openModal<SContent extends SnippetWithFirstArg<SContent>>(
		config: ModalConfig<SContent>
	) {
		queue.push(config as ModalConfig<Snippet<[unknown]>>);
		internalOpen();
	}

	function internalOpen() {
		if (!modal) throw new Error("Modal is missing");

		if (modal.open) return;

		const next = queue.shift();
		if (!next) return;

		current = next;
		modal.showModal();
	}

	export async function close() {
		if (!modal) throw new Error("Modal is missing");

		modal.requestClose();
		await waitForTransition(modal);

		current = undefined;
		internalOpen();
	}
</script>

<dialog class="modal" bind:this={modal}>
	{#if current}
		<div class="modal-box">
			<!-- Title -->
			{#if typeof current.title === "string"}
				<h3 class="text-lg font-semibold">{current.title}</h3>
			{:else}
				<h3
					class={[
						"text-lg font-semibold",
						current.title.color === "primary" && "text-primary",
						current.title.color === "success" && "text-success",
						current.title.color === "warning" && "text-warning",
						current.title.color === "error" && "text-error"
					]}>
					{current.title.text}
				</h3>
			{/if}

			<!-- Content -->
			{#if current.content}
				{#if typeof current.content === "string"}
					<p class="my-4">{current.content}</p>
				{:else}
					<div class="my-4">
						{@render current.content.snippet(current.content.args)}
					</div>
				{/if}
			{/if}

			<!-- Actions -->
			<div class="modal-action">
				{@render actionButtonSnippet(current.primaryButton)}
				{#if current.secondaryButton}
					{@render actionButtonSnippet(current.secondaryButton)}
				{/if}
			</div>
		</div>
	{/if}
</dialog>

{#snippet actionButtonSnippet(source: ModalConfigButton)}
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
