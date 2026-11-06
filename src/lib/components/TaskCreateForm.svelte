<script lang="ts">
	import type { Snippet } from "svelte";
	import { onDestroy } from "svelte";
	import type { TaskCategory } from "#lib/domain/task-category.ts";
	import { closeModal } from "#lib/components/Modal.svelte";
	import { getTaskSubcategories, taskSubcategoryLabel } from "#lib/domain/task-subcategory.ts";
	import { createTask } from "#lib/remotes/form/create-task.remote.ts";

	type Props = {
		category?: TaskCategory;
		submitLabel?: string;
		onSaved?: (taskId: string) => void | Promise<void>;
		children?: Snippet;
	};

	let { category, submitLabel = "Save task", onSaved, children }: Props = $props();

	let selectedCategory = $derived<TaskCategory>(
		(category || createTask.fields.category.value()) ?? "1"
	);
	let previewUrl = $state<string | undefined>(undefined);

	const subcategoryOptions = $derived(getTaskSubcategories(selectedCategory));

	function handleImageChange() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = undefined;

		const file = createTask.fields.image.value();
		if (file) {
			previewUrl = URL.createObjectURL(file);
		}
	}

	onDestroy(() => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
	});
</script>

<form
	{...createTask.enhance(async (f) => {
		if (await f.submit()) {
			const taskId = createTask.result?.taskId;
			await closeModal();
			if (taskId) {
				await onSaved?.(taskId);
			}
		}
	})}
	class="flex flex-col gap-3 p-2"
	enctype="multipart/form-data"
	oninput={() => createTask.validate()}>
	{#if category}
		<input {...createTask.fields.category.as("hidden", selectedCategory)} />
	{:else}
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Task category</legend>
			<div class="join w-full" role="group" aria-label="Task category">
				{#each [{ v: "1", l: "Task 1 · Visual report" }, { v: "2", l: "Task 2 · Essay" }] as option, i (option.v)}
					<label class="btn relative join-item flex-1 has-checked:btn-primary">
						<input
							{...createTask.fields.category.as("radio", option.v, i === 0)}
							class="sr-only"
							required />
						{option.l}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Subcategory</legend>
		<select {...createTask.fields.subcategory.as("select", "")} class="select w-full">
			<option value="">None</option>
			{#each subcategoryOptions as subcategoryOption (subcategoryOption)}
				<option value={subcategoryOption}>{taskSubcategoryLabel(subcategoryOption)}</option>
			{/each}
		</select>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Prompt</legend>
		<textarea
			{...createTask.fields.prompt.as("text")}
			class="textarea w-full"
			rows="5"
			required
			placeholder="Paste or type the task prompt...">
		</textarea>
	</fieldset>

	{#if selectedCategory === "1"}
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Image</legend>
			<input
				{...createTask.fields.image.as("file")}
				class="file-input w-full file-input-sm"
				accept="image/jpeg,image/png,image/webp,image/avif"
				onchange={handleImageChange} />
			<span class="fieldset-label">Max size 1MB</span>
			{#if previewUrl}
				<img
					src={previewUrl}
					alt="Selected visual preview"
					class="max-h-40 w-full rounded-box border border-base-content/10 object-contain" />
			{/if}
		</fieldset>
	{/if}

	{@render children?.()}

	{#each createTask.fields.allIssues() as issue (issue.message)}
		<p class="text-xs text-error" role="alert">{issue.message}</p>
	{/each}

	<div class="modal-action">
		<button type="button" class="btn btn-ghost btn-error" onclick={closeModal}>Cancel</button>
		<button type="submit" class="btn btn-primary" disabled={createTask.pending > 0}>
			{createTask.pending > 0 ? "Saving..." : submitLabel}
		</button>
	</div>
</form>
