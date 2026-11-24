<script lang="ts">
	import { goto } from "$app/navigation";
	import type { TaskCategory } from "#lib/domain/task.ts";
	import type { PracticeType } from "#lib/domain/practice-session.ts";
	import { createPractice } from "#lib/remotes/practice-session.remote.ts";
	import { closeModal, openModal } from "#lib/components/Modal.svelte";
	import PracticeTypePicker from "./PracticeTypePicker.svelte";

	type Props = { category: TaskCategory; openKey: number };
	let { category, openKey }: Props = $props();

	let practiceType = $state<PracticeType>("timed");

	// The modal component instance survives between opens; reset the picker each time.
	$effect(() => {
		void openKey;
		practiceType = "timed";
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		try {
			const result = await createPractice({
				taskCategory: category,
				taskId: undefined,
				practiceSessionType: practiceType
			});
			if (result.success) {
				await goto(result.location);
				await closeModal();
			}
		} catch (error) {
			openModal({
				title: "Unable to start practice",
				content: String(error),
				primaryButton: "Close"
			});
		}
	}
</script>

<p class="mb-3 text-xs text-base-content/75">
	Set up the task you want to write about, pick a practice style, and start.
</p>
<form onsubmit={handleSubmit}>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">Practice style</legend>
		<PracticeTypePicker bind:value={practiceType} {category} />
	</fieldset>

	<div class="modal-action">
		<button type="reset" class="btn btn-ghost btn-error" onclick={closeModal}>Cancel</button>
		<button type="submit" class="btn btn-primary" disabled={createPractice.pending > 0}>
			{createPractice.pending > 0 ? "Creating..." : "Create"}
		</button>
	</div>
</form>
