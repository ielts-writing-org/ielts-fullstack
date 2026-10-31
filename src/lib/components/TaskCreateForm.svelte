<script lang="ts">
	import type { Snippet } from "svelte";
	import { onDestroy } from "svelte";
	import { closeModal } from "#lib/components/Modal.svelte";
	import {
		TASK_SUBCATEGORIES_BY_CATEGORY,
		taskSubcategoryLabel
	} from "#lib/mappings/task-subcategory.ts";
	import { createTask } from "../../routes/(protected)/tasks/create-task.remote.ts";

	type Props = {
		/** Fixed task category; omit to let the user choose between Task 1 and Task 2. */
		category?: "1" | "2";
		/** Label for the submit button. */
		submitLabel?: string;
		/** Called with the new task id after the modal is closed. */
		onSaved?: (taskId: string) => void | Promise<void>;
		/** Extra form fields rendered between the task fields and the actions. */
		children?: Snippet;
	};

	let {
		category,
		submitLabel = "Save task",
		onSaved,
		children
	}: Props = $props();

	// The component remounts on every modal open, so capturing the fixed
	// category prop once here is intentional.
	// svelte-ignore state_referenced_locally
	let selectedCategory = $state<"1" | "2">(category ?? "1");
	let subcategory = $state("");
	let prompt = $state("");
	let files = $state<FileList | null>(null);
	let previewUrl = $state<string | undefined>(undefined);
	let error = $state<string | null>(null);

	const subcategoryOptions = $derived(TASK_SUBCATEGORIES_BY_CATEGORY[selectedCategory]);

	const form = createTask.enhance(async (f) => {
		if (await f.submit()) {
			const taskId = createTask.result?.taskId;
			await closeModal();
			if (taskId) {
				await onSaved?.(taskId);
			}
		} else {
			error = f.fields.allIssues()?.[0]?.message ?? "Please review the highlighted fields.";
		}
	});

	function handleCategoryChange() {
		subcategory = "";
	}

	function handleImageChange(event: Event) {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrl = undefined;

		const file = (event.currentTarget as HTMLInputElement).files?.[0];
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
	{...form}
	class="flex flex-col gap-3"
	enctype="multipart/form-data"
	oninput={() => (error = null)}>
	{#if category}
		<input type="hidden" name="category" value={selectedCategory} />
	{:else}
		<fieldset class="flex flex-col gap-1.5">
			<legend class="text-xs font-semibold text-base-content/75">Task category</legend>
			<div class="join w-full" role="group" aria-label="Task category">
				{#each [{ v: "1", l: "Task 1 · Visual report" }, { v: "2", l: "Task 2 · Essay" }] as option (option.v)}
					<label class={["btn join-item flex-1", selectedCategory === option.v ? "btn-primary" : ""]}>
						<input
							class="appearance-none"
							type="radio"
							name="category"
							value={option.v}
							bind:group={selectedCategory}
							onchange={handleCategoryChange} />
						{option.l}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<label class="flex flex-col gap-1.5">
		<span class="text-xs font-semibold text-base-content/75">
			Subcategory <span class="font-normal">(optional)</span>
		</span>
		<select class="select w-full" name="subcategory" bind:value={subcategory}>
			<option value="">None</option>
			{#each subcategoryOptions as subcategoryOption (subcategoryOption)}
				<option value={subcategoryOption}>{taskSubcategoryLabel(subcategoryOption)}</option>
			{/each}
		</select>
	</label>

	<label class="flex flex-col gap-1.5">
		<span class="text-xs font-semibold text-base-content/75">Prompt</span>
		<textarea
			class="textarea w-full"
			name="prompt"
			rows="5"
			required
			maxlength={20000}
			placeholder="Paste or type the task prompt..."
			bind:value={prompt}></textarea>
	</label>

	{#if selectedCategory === "1"}
		<fieldset class="flex flex-col gap-1.5">
			<legend class="text-xs font-semibold text-base-content/75">
				Image <span class="font-normal">(required for evaluation)</span>
			</legend>
			<input
				class="file-input file-input-sm file-input-bordered w-full"
				type="file"
				name="image"
				accept="image/jpeg,image/png,image/webp,image/avif"
				bind:files={files}
				onchange={handleImageChange} />
			{#if previewUrl}
				<img
					src={previewUrl}
					alt="Selected visual preview"
					class="max-h-40 w-full rounded-box border border-base-content/10 object-contain" />
			{/if}
		</fieldset>
	{/if}

	{@render children?.()}

	{#if error}
		<p class="text-xs text-error" role="alert">{error}</p>
	{/if}

	<div class="modal-action">
		<button type="button" class="btn" onclick={() => closeModal()}>Cancel</button>
		<button type="submit" class="btn btn-primary" disabled={createTask.pending > 0}>
			{createTask.pending > 0 ? "Saving..." : submitLabel}
		</button>
	</div>
</form>
