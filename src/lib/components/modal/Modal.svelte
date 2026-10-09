<script lang="ts" module>
	type ConfigButton = {
		text: string;
		action?: () => void | Promise<void>;
		color?: "default" | "primary" | "success" | "warning" | "error";
		style?: "default" | "ghost" | "outline";
		explicitClose?: boolean;
	};

	type Config = {
		title: string | { text: string; color: "default" | "success" | "warning" | "error" };
		content: string;
		primaryButton: ConfigButton;
		secondaryButton?: ConfigButton;
		children?: Snippet;
	};

	let current = $state<Config>();
	const queue = $state<Config[]>([]);

	export let openModal: (config: Config) => void;
	export let closeModal: () => void;

	type ModalFunctions = {
		open: typeof openModal;
		close: typeof closeModal;
	};

	function registerModal(fn: ModalFunctions) {
		openModal = fn.open;
		closeModal = fn.close;
	}
</script>

<script lang="ts">
	import { waitForTransition } from "#lib/utils/dom.ts";
	import { onMount, type Snippet } from "svelte";

	let modal = $state<HTMLDialogElement>();

	function addAndOpen(config: Config) {
		queue.push(config);
		open();
	}

	function open() {
		if (!modal) throw new Error("Modal is missing");

		if (modal.open) return;

		const next = queue.shift();
		if (!next) return;

		current = next;
		modal.showModal();
	}

	async function close() {
		if (!modal) throw new Error("Modal is missing");

		modal.requestClose();
		await waitForTransition(modal);

		open();
	}

	onMount(() => {
		registerModal({
			open: addAndOpen,
			close: close
		});

		if (queue.length) open();
	});
</script>

<dialog class="modal" bind:this={modal}>
	{#if current}
		<div class="modal-box">
			<h3 class="text-lg font-semibold">
				{typeof current.title === "string" ? current.title : current.title.text}
			</h3>
			<p class="py-4">{current.content}</p>
			{@render current.children?.()}
			<div class="modal-action">
				<button
					class={[
						"btn",
						current.primaryButton.color === "primary" && "btn-primary",
						current.primaryButton.color === "success" && "btn-success",
						current.primaryButton.color === "warning" && "btn-warning",
						current.primaryButton.color === "error" && "btn-error",
						current.primaryButton.style === "ghost" && "btn-ghost",
						current.primaryButton.style === "outline" && "btn-outline"
					]}
					onclick={async () => {
						await current?.primaryButton.action?.();
						if (!current?.primaryButton.explicitClose) close();
					}}>
					{current.primaryButton.text}
				</button>
				{#if current.secondaryButton}
					<button
						class={[
							"btn",
							current.secondaryButton.color === "primary" && "btn-primary",
							current.secondaryButton.color === "success" && "btn-success",
							current.secondaryButton.color === "warning" && "btn-warning",
							current.secondaryButton.color === "error" && "btn-error",
							current.secondaryButton.style === "ghost" && "btn-ghost",
							current.secondaryButton.style === "outline" && "btn-outline"
						]}
						onclick={async () => {
							await current?.secondaryButton?.action?.();
							if (!current?.secondaryButton?.explicitClose) close();
						}}>
						{current.secondaryButton.text}
					</button>
				{/if}
			</div>
		</div>
	{/if}
</dialog>
