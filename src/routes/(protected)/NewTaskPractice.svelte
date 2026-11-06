<script lang="ts">
	import { goto } from "$app/navigation";
	import type { TaskCategory } from "#lib/domain/task-category.ts";
	import type { PracticeType } from "#lib/domain/practice-type.ts";
	import { createPractice } from "#lib/remotes/command/create-practice.remote.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import TaskCreateForm from "#lib/components/TaskCreateForm.svelte";
	import PracticeTypePicker from "./PracticeTypePicker.svelte";

	type Props = { category: TaskCategory; openKey: number };
	let { category, openKey }: Props = $props();

	let practiceType = $state<PracticeType>("timed");

	// The modal component instance survives between opens; reset the picker each time.
	$effect(() => {
		void openKey;
		practiceType = "timed";
	});

	async function startPractice(taskId: string) {
		try {
			const result = await createPractice({
				taskCategory: category,
				taskId,
				practiceSessionType: practiceType
			});
			if (result.success) {
				goto(result.location);
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
<TaskCreateForm {category} submitLabel="Start practice" onSaved={startPractice}>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">Practice style</legend>
		<PracticeTypePicker bind:value={practiceType} {category} />
	</fieldset>
</TaskCreateForm>
