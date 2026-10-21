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

	const stack = $state<ModalConfig<GenericSnippet>[]>([]);
	let current = $state<ModalConfig<GenericSnippet>>();
	let modal = $state<HTMLDialogElement>();
	let isBusy = $state<boolean>(false);

	export async function openModal<SContent extends SnippetWithFirstArg<SContent>>(
		config: ModalConfig<SContent>
	) {
		if (!modal) throw new Error("Modal is missing");

		if (current) {
			modal.requestClose();
			await waitForTransition(modal);

			stack.unshift(current);
		}

		current = config as ModalConfig<Snippet<[unknown]>>;
		modal.showModal();
	}

	export async function closeModal() {
		if (!modal) throw new Error("Modal is missing");

		modal.requestClose();
		await waitForTransition(modal);

		current = undefined;

		const next = stack.pop();
		if (!next) {
			return;
		}

		current = next;
		modal.showModal();
	}
</script>

<script lang="ts">
	import { beforeNavigate } from "$app/navigation";

	beforeNavigate(({ cancel, shallow }) => {
		const canLeave = shallow || !isBusy;
		if (!canLeave && !window.confirm("The action has not been completed. Navigate anyway?")) {
			cancel();
		}
	});
</script>

<svelte:window on:beforeunload={(e) => isBusy && e.preventDefault()} />

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
		<button class="btn" onclick={closeModal}>{source}</button>
	{:else}
		<button
			class={[
				"btn disabled:pointer-events-auto disabled:cursor-not-allowed",
				source.color === "primary" && "btn-primary",
				source.color === "success" && "btn-success",
				source.color === "warning" && "btn-warning",
				source.color === "error" && "btn-error",
				source.style === "ghost" && "btn-ghost",
				source.style === "outline" && "btn-outline"
			]}
			disabled={isBusy}
			onclick={async () => {
				isBusy = true;
				try {
					await source.action?.();
				} finally {
					isBusy = false;
				}

				if (!source.explicitClose) closeModal();
			}}>
			{source.text}
		</button>
	{/if}
{/snippet}
