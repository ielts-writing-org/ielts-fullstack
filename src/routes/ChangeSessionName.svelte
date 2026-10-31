<script lang="ts">
	import { invalidate } from "$app/navigation";
	import { page } from "$app/state";
	import { SavePen } from "@lucide/svelte";
	import { changeSessionName } from "./change-session-name.remote";
	import { closeModal } from "#lib/components/Modal.svelte";

	let newName = $derived<string>(page.data.pageName);

	async function handleSave() {
		await changeSessionName({
			practiceSessionId: page.params.practiceSessionId!,
			newName: newName
		});
		invalidate("data:practiceSession");
		closeModal();
	}

	function handleCancel() {
		closeModal();
	}
</script>

<form class="group contents">
	<p class="mb-4">Enter a new practice session name:</p>
	<label class="validator input">
		<SavePen size="1em" />
		<input class="input" bind:value={newName} minlength="1" maxlength="64" required />
	</label>

	<div class="modal-action">
		<button
			class="btn btn-primary group-invalid:btn-disabled"
			disabled={changeSessionName.pending > 0}
			onclick={handleSave}>
			Save
		</button>
		<button
			class="btn btn-ghost btn-error"
			disabled={changeSessionName.pending > 0}
			onclick={handleCancel}>
			Cancel
		</button>
	</div>
</form>
