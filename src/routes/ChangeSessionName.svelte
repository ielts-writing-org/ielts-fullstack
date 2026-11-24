<script lang="ts">
	import { invalidate } from "$app/navigation";
	import { page } from "$app/state";
	import { SavePen } from "@lucide/svelte";
	import { changeSessionName } from "#lib/remotes/practice-session.remote.ts";
	import { closeModal, openModal } from "#lib/components/Modal.svelte";

	let newName = $state(page.data.metadata?.title ?? "");
	let pending = $state(false);

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();

		if (pending) return;
		pending = true;
		try {
			await changeSessionName({ practiceSessionId: page.params.practiceSessionId!, newName });
			await invalidate("data:practiceSession");
			closeModal();
		} catch (e) {
			await openModal({
				title: { text: "Could not rename session", color: "error" },
				content: `${e}`,
				primaryButton: "Close"
			});
		} finally {
			pending = false;
		}
	}

	function handleCancel() {
		closeModal();
	}
</script>

<form class="group contents" onsubmit={handleSave}>
	<p class="mb-4">Enter a new practice session name:</p>
	<label class="validator input">
		<SavePen size="1em" />
		<input class="input" bind:value={newName} minlength="1" maxlength="64" required />
	</label>

	<div class="modal-action">
		<button type="reset" class="btn btn-ghost btn-error" disabled={pending} onclick={handleCancel}>
			Cancel
		</button>
		<button type="submit" class="btn btn-primary group-invalid:btn-disabled" disabled={pending}>
			Save
		</button>
	</div>
</form>
