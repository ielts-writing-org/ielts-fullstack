<script lang="ts" module>
	type Error = { title: string; message: string };

	export let showError: (error: Error) => void;

	function registerShowError(fn: typeof showError) {
		showError = fn;
	}
</script>

<script lang="ts">
	import { waitForTransition } from "#lib/utils/dom.ts";
	import { onMount } from "svelte";

	let modal = $state<HTMLDialogElement>();
	let error = $state<Error>();
	const errorStack = $state<Error[]>([]);

	function showError(error: Error) {
		errorStack.push(error);
		handleOpen();
	}

	function handleOpen() {
		if (!modal || modal.open) {
			return;
		}

		const lastMessage = errorStack.pop();
		if (!lastMessage) {
			return;
		}

		error = lastMessage;
		modal.showModal();
	}

	async function handleClose(e: Event) {
		if (!modal) {
			throw new Error("Error modal is missing");
		}

		e.preventDefault();
		modal.requestClose();
		await waitForTransition(modal);

		handleOpen();
	}

	onMount(() => {
		registerShowError(showError);

		if (errorStack.length) {
			handleOpen();
		}
	});
</script>

<dialog class="modal" bind:this={modal}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">{error?.title ?? "Error"}</h3>
		<p class="py-4">
			{error?.message ?? "There was an expected error during the process."}
		</p>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn" onclick={handleClose}>Close</button>
			</form>
		</div>
	</div>
</dialog>
