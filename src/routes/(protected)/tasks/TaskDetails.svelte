<script lang="ts">
	import { getImageUrl } from "#lib/utils/paths.ts";
	import { type TaskItem } from "./links.ts";

	type Props = {
		task: TaskItem;
		onPractice: () => void | Promise<void>;
		onEdit: () => void | Promise<void>;
		onDelete: () => void | Promise<void>;
	};
	let { task, onPractice, onEdit, onDelete }: Props = $props();
</script>

<div class="mt-4"></div>
{#if task.imageName}
	<img
		src={getImageUrl(task.imageName)}
		alt="Task visual"
		class="max-h-64 w-full border border-base-content/10 bg-base-200/50 object-contain" />
{/if}
<p class="text-sm whitespace-pre-wrap">
	{task.prompt || "No prompt yet — add one by editing this task."}
</p>
<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-base-content/75">
	<dt class="font-semibold">Created</dt>
	<dd>{task.createdAt.toLocaleString()}</dd>
	<dt class="font-semibold">Updated</dt>
	<dd>{task.updatedAt.toLocaleString()}</dd>
	<dt class="font-semibold">Practice sessions</dt>
	<dd>
		{task.sessionCount}
		{#if task.bestBand !== null}
			· best band {task.bestBand.toFixed(1)}
		{/if}
	</dd>
</dl>

<div class="modal-action justify-between">
	{#if !task.isExample}
		<div>
			<button type="button" class="btn btn-ghost btn-error" onclick={onDelete}>Delete</button>
		</div>
	{/if}
	<div>
		{#if !task.isExample}
			<button
				type="button"
				class="btn btn-outline"
				onclick={async () => {
					await onEdit();
				}}>
				Edit
			</button>
		{/if}

		<button
			type="button"
			class="btn btn-primary"
			onclick={async () => {
				await onPractice();
			}}>
			Practice
		</button>
	</div>
</div>
