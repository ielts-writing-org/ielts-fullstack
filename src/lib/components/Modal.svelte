<script lang="ts" module>
	import { type Component, type ComponentProps, type Snippet } from "svelte";
	import { waitForTransition } from "#lib/utils/dom.ts";

	type SnippetArgs<T> = T extends Snippet<infer P> ? P : never;
	type SnippetFirstArg<T> = SnippetArgs<T> extends [] ? never : SnippetArgs<T>[0];
	type SnippetWithFirstArg<T> = Snippet<[SnippetFirstArg<T>]>;
	type GenericSnippet = Snippet<[unknown]>;
	type GenericComponent = Component<Record<string, unknown>>;

	type ModalConfig<
		SContent extends SnippetWithFirstArg<SContent>,
		CContent extends Component<ComponentProps<CContent>>
	> = {
		title:
			string | { text: string; color: "default" | "primary" | "success" | "warning" | "error" };
		content?:
			| string
			| (SnippetFirstArg<SContent> extends never
					? { snippet: SContent }
					: { snippet: SContent; args: SnippetFirstArg<SContent> })
			| (ComponentProps<CContent> extends Record<string, never>
					? { component: CContent }
					: { component: CContent; props: ComponentProps<CContent> });
		primaryButton?: ModalButtonConfig;
		secondaryButton?: ModalButtonConfig;
		closeByBackdrop?: true | ModalCloseConfig;
		closeButton?: true | ModalCloseConfig;
		bypassBusy?: boolean;
	};

	type ModalCloseConfig = {
		onclick?: () => unknown | Promise<unknown>;
		disabled?: boolean;
	};

	type ModalButtonConfig =
		| string
		| {
				text: string;
				onclick?: () => unknown | Promise<unknown>;
				color?: "default" | "primary" | "success" | "warning" | "error";
				style?: "default" | "outline" | "ghost";
				disabled?: boolean;
				explicitClose?: boolean;
		  };

	const stack = $state<ModalConfig<GenericSnippet, GenericComponent>[]>([]);
	let current = $state<ModalConfig<GenericSnippet, GenericComponent>>();
	let modal = $state<HTMLDialogElement>();
	let isBusy = $state<boolean>(false);

	export async function openModal<
		SContent extends SnippetWithFirstArg<SContent>,
		CContent extends Component<ComponentProps<CContent>>
	>(config: ModalConfig<SContent, CContent>) {
		if (!modal) throw new Error("Modal is missing");

		if (current) {
			modal.requestClose();
			await waitForTransition(modal);

			stack.unshift(current);
		}

		current = config as unknown as ModalConfig<GenericSnippet, GenericComponent>;
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
		const canLeave = shallow || !isBusy || current?.bypassBusy;
		if (!canLeave && !window.confirm("The action has not been completed. Navigate anyway?")) {
			cancel();
		}
	});
</script>

<svelte:window on:beforeunload={(e) => isBusy && !current?.bypassBusy && e.preventDefault()} />

<dialog class="modal" bind:this={modal}>
	{#if current}
		<div class="modal-box">
			{#if current.closeButton}
				{@render closeButton(current.closeButton)}
			{/if}

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
					<p class="my-4 max-h-[50dvh] overflow-y-auto">{current.content}</p>
				{:else if "snippet" in current.content}
					<div class="my-4 max-h-[50dvh] overflow-y-auto">
						{@render current.content.snippet(current.content.args)}
					</div>
				{:else}
					<current.content.component {...current.content.props} />
				{/if}
			{/if}

			<!-- Actions -->
			{#if current.primaryButton}
				<div class="modal-action">
					{#if current.secondaryButton}
						{@render modalButton(current.secondaryButton)}
					{/if}
					{@render modalButton(current.primaryButton)}
				</div>
			{/if}
		</div>

		{#if current.closeByBackdrop}
			{@render backdropClose(current.closeByBackdrop)}
		{/if}
	{/if}
</dialog>

{#snippet modalButton(source: ModalButtonConfig)}
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
			disabled={isBusy || (source.disabled ?? false)}
			onclick={async () => {
				isBusy = true;
				try {
					await source.onclick?.();
				} finally {
					isBusy = false;
				}

				if (!source.explicitClose) closeModal();
			}}>
			{source.text}
		</button>
	{/if}
{/snippet}

{#snippet closeButton(closeButton: true | ModalCloseConfig)}
	{#if closeButton === true}
		<button class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm" onclick={closeModal}>
			✕
		</button>
	{:else}
		<button
			class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
			onclick={async () => {
				await closeButton.onclick?.();
				await closeModal();
			}}>
			✕
		</button>
	{/if}
{/snippet}

{#snippet backdropClose(closeByBackdrop: true | ModalCloseConfig)}
	<div class="modal-backdrop">
		{#if closeByBackdrop === true}
			<button onclick={closeModal}>close</button>
		{:else}
			<button
				onclick={async () => {
					await closeByBackdrop.onclick?.();
					await closeModal();
				}}>
				close
			</button>
		{/if}
	</div>
{/snippet}
