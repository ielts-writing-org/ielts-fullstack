<script lang="ts">
	import { goto } from "$app/navigation";
	import { closeModal } from "#lib/components/Modal.svelte";
	import { createPractice } from "#lib/remotes/command/create-practice.remote.js";
	import type { PracticeType } from "#lib/domain/practice-type.ts";
	import PracticeTypePicker from "../PracticeTypePicker.svelte";
	import type { TaskItem } from "./links.ts";

	type Props = { task: TaskItem };
	let { task }: Props = $props();

	let practiceType = $state<PracticeType>("timed");

	async function startPractice() {
		const result = await createPractice({
			taskCategory: task.category,
			taskId: task.id,
			practiceSessionType: practiceType
		});
		if (result.success) {
			goto(result.location);
		}
	}
</script>

<p class="mb-3 line-clamp-2 rounded-box bg-base-200/50 p-2.5 text-xs text-base-content/75">
	{task.prompt || "No prompt yet — you can add one while practicing."}
</p>
<p class="mb-2 text-sm font-semibold">How do you want to practice?</p>
<PracticeTypePicker bind:value={practiceType} category={task.category} />

<div class="modal-action">
	<button type="button" class="btn btn-ghost btn-error" onclick={closeModal}>Cancel</button>
	<button
		type="button"
		class="btn btn-primary"
		disabled={createPractice.pending > 0}
		onclick={startPractice}>
		{createPractice.pending > 0 ? "Starting..." : "Start practice"}
	</button>
</div>
