<script lang="ts">
	import { onDestroy } from "svelte";
	import { Trash } from "@lucide/svelte";
	import { closeModal } from "#lib/components/Modal.svelte";
	import { getTaskSubcategories, getTaskSubcategoryLabel } from "#lib/domain/task-subcategory.ts";
	import { clearTaskImage } from "#lib/remotes/command/clear-task-image.remote.js";
	import { updateTask } from "#lib/remotes/form/update-task.remote.js";
	import { type TaskItem } from "./links.ts";
	import { getImageUrl } from "#lib/utils/paths.ts";

	type Props = { task: TaskItem; onSaved?: () => void | Promise<void> };
	let { task, onSaved }: Props = $props();

	let previewUrl = $state<string | undefined>(undefined);
	let imageCleared = $state(false);
	const imageName = $derived(imageCleared ? "" : task.imageName);

	const subcategoryOptions = $derived(getTaskSubcategories(task.category));

	function handleImageChange() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = undefined;

		const file = updateTask.fields.image.value();
		if (file) {
			previewUrl = URL.createObjectURL(file);
		}
	}

	async function handleRemoveImage() {
		await clearTaskImage({ taskId: task.id });
		imageCleared = true;
		await onSaved?.();
	}

	onDestroy(() => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
	});
</script>

{#key task.id}
	<form
		{...updateTask.enhance(async (f) => {
			if (await f.submit()) {
				await onSaved?.();
				await closeModal();
			}
		})}
		class="flex flex-col gap-3"
		enctype="multipart/form-data"
		oninput={() => updateTask.validate()}>
		<input {...updateTask.fields.taskId.as("hidden", task.id)} />

		<div class="flex flex-wrap items-center gap-1.5">
			<span class="badge rounded-box badge-soft badge-xs font-semibold badge-primary">
				Task {task.category}
			</span>
			<span class="text-xs text-base-content/75">Category cannot be changed</span>
		</div>

		<label class="flex flex-col gap-1.5">
			<span class="text-xs font-semibold text-base-content/75">
				Subcategory <span class="font-normal">(optional)</span>
			</span>
			<select
				{...updateTask.fields.subcategory.as("select", task.subcategory ?? "")}
				class="select w-full">
				<option value="">None</option>
				{#each subcategoryOptions as subcategory (subcategory)}
					<option value={subcategory}>{getTaskSubcategoryLabel(subcategory)}</option>
				{/each}
			</select>
		</label>

		<label class="flex flex-col gap-1.5">
			<span class="text-xs font-semibold text-base-content/75">Prompt</span>
			<textarea
				{...updateTask.fields.prompt.as("text", task.prompt)}
				class="textarea w-full"
				rows="5"
				required
				maxlength={20000}
				placeholder="Paste or type the task prompt...">
			</textarea>
		</label>

		<fieldset class="flex flex-col gap-1.5">
			<legend class="text-xs font-semibold text-base-content/75">Image</legend>
			<input
				{...updateTask.fields.image.as("file")}
				class="file-input-bordered file-input w-full file-input-sm"
				accept="image/jpeg,image/png,image/webp,image/avif"
				onchange={handleImageChange} />
			{#if previewUrl}
				<img
					src={previewUrl}
					alt="Selected visual preview"
					class="max-h-40 w-full rounded-box border border-base-content/10 object-contain" />
			{:else if imageName}
				<img
					src={getImageUrl(imageName)}
					alt="Current task visual"
					class="max-h-40 w-full rounded-box border border-base-content/10 bg-base-200/50 object-contain" />
				<button
					type="button"
					class="btn self-start btn-ghost text-error btn-xs"
					disabled={clearTaskImage.pending > 0}
					onclick={handleRemoveImage}>
					<Trash size="1em" />
					Remove image
				</button>
			{/if}
		</fieldset>

		{#each updateTask.fields.allIssues() as issue (issue.message)}
			<p class="text-xs text-error" role="alert">{issue.message}</p>
		{/each}

		<div class="modal-action">
			<button type="button" class="btn" onclick={closeModal}>Cancel</button>
			<button type="submit" class="btn btn-primary" disabled={updateTask.pending > 0}>
				{updateTask.pending > 0 ? "Saving..." : "Save changes"}
			</button>
		</div>
	</form>
{/key}
