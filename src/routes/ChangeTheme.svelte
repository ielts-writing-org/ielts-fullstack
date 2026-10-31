<script lang="ts">
	import { closeModal } from "#lib/components/Modal.svelte";
	import ThemeController from "#lib/components/ThemeController.svelte";

	async function handleClose() {
		await closeModal();
	}
</script>

<p class="mb-4">Select an available theme below:</p>
<ThemeController />

<div class="modal-action">
	<button class="btn btn-ghost btn-error" onclick={handleClose}>Close</button>
</div>
