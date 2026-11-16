<script lang="ts">
	import { onDestroy, onMount, tick } from "svelte";
	import type { TaskCategory } from "#lib/domain/task-category.ts";
	import type { TaskSubcategory } from "#lib/domain/task-subcategory.ts";
	import { getTaskSubcategories, getTaskSubcategoryLabel } from "#lib/domain/task-subcategory.ts";
	import { getAdminTasks } from "#lib/remotes/query/admin-data.remote.ts";
	import {
		archiveAdminTask,
		createAdminTask,
		removeAdminTaskImage,
		restoreAdminTask,
		setAdminTaskVisibility,
		updateAdminTask
	} from "#lib/remotes/command/admin.remote.ts";
	import { saveAdminTaskImage } from "#lib/remotes/form/admin-task-image.remote.ts";

	type Result = Awaited<ReturnType<typeof getAdminTasks>>;
	type Task = Result["tasks"][number];
	const maxImageSize = 1 * 1024 * 1024;
	const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
	type Editor = {
		taskId?: string;
		category: "1" | "2";
		subcategory: "" | TaskSubcategory<TaskCategory>;
		topic: string;
		difficulty: "" | "beginner" | "intermediate" | "advanced";
		prompt: string;
		published: boolean;
	};
	let data = $state<Result | null>(null);
	let editor = $state<Editor | null>(null);
	let search = $state("");
	let category = $state<"all" | "1" | "2">("all");
	let source = $state<"all" | "system" | "personal">("all");
	let visibility = $state<"all" | "shown" | "hidden">("all");
	let status = $state<"active" | "archived">("active");
	let page = $state(1);
	let loading = $state(true);
	let busy = $state(false);
	let message = $state("");
	let messageIsError = $state(false);
	let loadError = $state("");
	let formError = $state("");
	let selectedImage = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let hasImage = $state(false);
	const pageSize = 15;
	const subcategories = $derived(editor ? getTaskSubcategories(editor.category) : []);

	async function load() {
		loading = true;
		loadError = "";
		try {
			const query = getAdminTasks({ page, pageSize, search, category, source, visibility, status });
			await query.refresh();
			data = await query;
		} catch (cause) {
			loadError = cause instanceof Error ? cause.message : "Could not load question bank.";
		} finally {
			loading = false;
		}
	}
	onMount(() => void load());
	function filterChanged() { page = 1; void load(); }
	function clearSelectedImage() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		selectedImage = null;
		const input = saveAdminTaskImage.element?.querySelector<HTMLInputElement>('input[type="file"]');
		if (input) input.value = "";
	}
	function closeEditor() {
		clearSelectedImage();
		editor = null;
	}
	function startCreate() {
		formError = "";
		clearSelectedImage();
		hasImage = false;
		editor = { category: "1", subcategory: "", topic: "", difficulty: "", prompt: "", published: true };
	}
	function startEdit(task: Task) {
		formError = "";
		clearSelectedImage();
		hasImage = Boolean(task.image);
		editor = { taskId: task.id, category: task.category, subcategory: task.subcategory ?? "", topic: task.topic ?? "", difficulty: task.difficulty ?? "", prompt: task.prompt, published: task.published };
	}
	function chooseImage(event: Event) {
		const input = event.currentTarget;
		if (!(input instanceof HTMLInputElement)) return;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		selectedImage = null;
		const file = input.files?.[0] ?? null;
		formError = "";
		if (file && file.size > maxImageSize) {
			input.value = "";
			selectedImage = null;
			formError = "The image must be 1 MB or smaller.";
			return;
		}
		if (file && !allowedImageTypes.includes(file.type)) {
			input.value = "";
			selectedImage = null;
			formError = "Choose a JPEG, PNG, WebP, or AVIF image.";
			return;
		}
		selectedImage = file;
		if (file) previewUrl = URL.createObjectURL(file);
	}
	onDestroy(() => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	});
	async function finishImageUpload() {
		const nextId = saveAdminTaskImage.result?.taskId;
		if (editor && nextId) editor = { ...editor, taskId: nextId };
		clearSelectedImage();
		hasImage = true;
		saveAdminTaskImage.element?.reset();
		message = editor?.published
			? "Image uploaded and question shown in the task library. The prior version remains available to existing sessions."
			: "Image uploaded. The prior task version remains available to existing sessions.";
		messageIsError = false;
		await load();
	}
	async function uploadSelectedImage(submit = () => saveAdminTaskImage.submit()) {
		const ownsBusyState = !busy;
		if (ownsBusyState) busy = true;
		formError = "";
		try {
			// Remote forms build FormData synchronously. Capture it before disabling
			// the file control, otherwise browsers omit the disabled file field.
			const submission = submit();
			const fileInput = saveAdminTaskImage.element?.querySelector<HTMLInputElement>('input[type="file"]');
			if (fileInput) fileInput.disabled = true;
			if (!(await submission)) {
				formError = saveAdminTaskImage.fields.allIssues()?.[0]?.message ?? "Choose a supported image up to 1 MB.";
				message = "The question was saved, but its image was not uploaded. Correct the image and try again.";
				messageIsError = true;
				return false;
			}
			await finishImageUpload();
			return true;
		} catch (cause) {
			formError = cause instanceof Error ? cause.message : "Could not upload the question image.";
			message = "The question was saved, but its image was not uploaded. Correct the image and try again.";
			messageIsError = true;
			return false;
		} finally {
			const fileInput = saveAdminTaskImage.element?.querySelector<HTMLInputElement>('input[type="file"]');
			if (fileInput) fileInput.disabled = false;
			if (ownsBusyState) busy = false;
		}
	}
	async function saveTask() {
		if (!editor) return;
		busy = true;
		formError = "";
		message = "";
		messageIsError = false;
		try {
			const publishWhenReady = editor.published;
			const saved = editor.taskId
				? await updateAdminTask({ ...editor, taskId: editor.taskId })
				: await createAdminTask(editor);
			editor = { ...editor, taskId: saved.taskId, published: publishWhenReady };
			if (editor.category === "2") hasImage = false;
			message = saved.published
				? "Question saved and shown in the task library."
				: editor.published && editor.category === "1"
					? selectedImage
						? "Question saved as hidden. Upload the selected image to publish this Task 1 question."
						: "Question saved as hidden. Upload a Task 1 image to publish it."
					: "Question saved as hidden. It will not appear in the task library until you show it.";
			messageIsError = false;
			await load();
			if (editor.category === "1" && selectedImage) {
				await tick();
				if (!(await uploadSelectedImage())) return;
			}
			closeEditor();
		} catch (cause) {
			formError = cause instanceof Error ? cause.message : "Could not save question.";
		} finally {
			busy = false;
		}
	}
	const imageForm = saveAdminTaskImage.enhance(async (form) => {
		await uploadSelectedImage(() => form.submit());
	});
	async function mutate(action: () => Promise<unknown>, success: string) {
		busy = true;
		message = "";
		messageIsError = false;
		loadError = "";
		try { await action(); message = success; messageIsError = false; await load(); }
		catch (cause) { loadError = cause instanceof Error ? cause.message : "The action failed."; }
		finally { busy = false; }
	}
	async function removeImage() {
		if (!editor?.taskId || !window.confirm("Remove the image from the active task version? The existing version and its image remain for prior sessions.")) return;
		busy = true; formError = ""; message = "";
		try {
			const result = await removeAdminTaskImage({ taskId: editor.taskId });
			editor = { ...editor, taskId: result.taskId, published: false };
			hasImage = false;
			message = "Image removed from the active task version; the prior version was preserved.";
			messageIsError = false;
			await load();
		} catch (cause) { formError = cause instanceof Error ? cause.message : "Could not remove image."; }
		finally { busy = false; }
	}
</script>

<svelte:head><title>Question Bank · Admin</title></svelte:head>
<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
	<div>
		<p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Content management</p>
		<h1 class="mt-1 text-3xl font-bold tracking-tight">Question Bank</h1>
		<p class="mt-1 max-w-2xl text-sm text-base-content/70">Manage system and personal tasks, including archived versions used by existing sessions.</p>
	</div>
	<button class="btn btn-primary" disabled={busy} onclick={startCreate}>Add question</button>
</div>
{#if message}<div class="alert mt-4" class:alert-error={messageIsError} class:alert-success={!messageIsError} role={messageIsError ? "alert" : "status"}>{message}</div>{/if}
{#if loadError}<div class="alert alert-error mt-4" role="alert">{loadError}<button class="btn btn-sm" onclick={() => void load()}>Retry</button></div>{/if}

<section class="admin-panel p-4 sm:p-5" aria-label="Question filters">
	<div class="mb-4"><h2 class="font-semibold">Filter questions</h2><p class="text-sm text-base-content/65">Combine search and filters to find the right task version.</p></div>
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<label class="admin-field sm:col-span-2 xl:col-span-1"><span class="admin-field-label">Search</span><input class="input input-bordered w-full" type="search" placeholder="Prompt or topic" bind:value={search} oninput={filterChanged} /></label>
		<label class="admin-field"><span class="admin-field-label">Task</span><select class="select select-bordered w-full" bind:value={category} onchange={filterChanged}><option value="all">All tasks</option><option value="1">Task 1</option><option value="2">Task 2</option></select></label>
		<label class="admin-field"><span class="admin-field-label">Source</span><select class="select select-bordered w-full" bind:value={source} onchange={filterChanged}><option value="all">All sources</option><option value="system">System</option><option value="personal">Personal</option></select></label>
		<label class="admin-field"><span class="admin-field-label">Visibility</span><select class="select select-bordered w-full" bind:value={visibility} onchange={filterChanged}><option value="all">All visibility</option><option value="shown">Shown</option><option value="hidden">Hidden</option></select></label>
		<label class="admin-field"><span class="admin-field-label">Version status</span><select class="select select-bordered w-full" bind:value={status} onchange={filterChanged}><option value="active">Active</option><option value="archived">Archived</option></select></label>
	</div>
</section>

{#if editor}
	<section class="admin-panel ring-1 ring-primary/30">
		<div class="card-body gap-5 p-4 sm:p-6">
			<div class="flex items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-wider text-primary">Question editor</p><h2 class="mt-1 text-xl font-bold">{editor.taskId ? "Edit question version" : "New system question"}</h2></div><button class="btn btn-ghost btn-sm" disabled={busy} onclick={closeEditor}>Close</button></div>
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="admin-field"><span class="admin-field-label">Task</span><select class="select select-bordered w-full" disabled={busy} bind:value={editor.category} onchange={() => { editor!.subcategory = ""; clearSelectedImage(); }}><option value="1">Task 1 · Visual report</option><option value="2">Task 2 · Essay</option></select></label>
				<label class="admin-field"><span class="admin-field-label">Question type</span><select class="select select-bordered w-full" disabled={busy} bind:value={editor.subcategory}><option value="">Uncategorized</option>{#each subcategories as item (item)}<option value={item}>{getTaskSubcategoryLabel(item)}</option>{/each}</select></label>
				<label class="admin-field"><span class="admin-field-label">Topic</span><input class="input input-bordered w-full" disabled={busy} maxlength="160" bind:value={editor.topic} /></label>
				<label class="admin-field"><span class="admin-field-label">Difficulty</span><select class="select select-bordered w-full" disabled={busy} bind:value={editor.difficulty}><option value="">Unspecified</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
			</div>
			<label class="flex items-start gap-3 rounded-xl bg-base-200/50 p-3">
				<input class="checkbox checkbox-primary mt-0.5" type="checkbox" disabled={busy} bind:checked={editor.published} />
				<span><span class="block font-semibold">Show in the task library</span><span class="mt-1 block text-sm text-base-content/65">Task 2 appears after saving. Task 1 appears after its required image is uploaded. Uncheck to keep this question hidden.</span></span>
			</label>
			<label class="admin-field"><span class="admin-field-label">Prompt</span><textarea class="textarea textarea-bordered min-h-40 w-full" disabled={busy} maxlength="20000" required bind:value={editor.prompt}></textarea></label>
			{#if editor.category === "1"}
				<div class="flex flex-col gap-4 rounded-2xl bg-base-200/60 p-4 sm:p-5">
					<div><h3 class="font-semibold">Task 1 image <span class="text-error">Required to publish</span></h3><p class="mt-1 text-sm text-base-content/65">You can select the chart before saving. It uploads automatically after the question is created.</p></div>
					{#if editor.taskId && hasImage}<img src={`/tasks/${editor.taskId}/image`} alt="Current task chart" class="max-h-56 w-full object-contain" />{/if}
					<form {...imageForm} enctype="multipart/form-data" class="flex flex-col gap-3 sm:flex-row sm:items-end">
						<input {...saveAdminTaskImage.fields.taskId.as("hidden", editor.taskId ?? "")} />
						<input {...saveAdminTaskImage.fields.published.as("hidden", editor.published ? "true" : "false")} />
						<label class="admin-field flex-1"><span class="admin-field-label">Choose image</span><input {...saveAdminTaskImage.fields.image.as("file")} class="file-input file-input-bordered w-full" accept="image/jpeg,image/png,image/webp,image/avif" required onchange={chooseImage} />{#if selectedImage}<span class="text-xs text-base-content/70">Selected: {selectedImage.name} · {(selectedImage.size / 1024).toFixed(0)} KB</span>{/if}</label>
						<button class="btn btn-outline" type="submit" disabled={busy || !editor.taskId || !selectedImage || saveAdminTaskImage.pending > 0}>{saveAdminTaskImage.pending ? "Uploading…" : editor.taskId ? "Upload / replace" : "Uploads after saving"}</button>
					</form>
					{#if previewUrl}
						<figure class="flex flex-col gap-2 rounded-xl border border-base-content/10 bg-base-100 p-3">
							<figcaption class="text-sm font-semibold">Selected image preview</figcaption>
							<img src={previewUrl} alt="Preview of the selected Task 1 chart" class="max-h-72 w-full rounded-lg object-contain" />
						</figure>
					{/if}
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs text-base-content/65">JPEG, PNG, WebP, or AVIF · up to 1 MB. Replacing creates a version; existing sessions keep their original image.</p>{#if editor.taskId}<button type="button" class="btn btn-ghost btn-sm self-start text-error" disabled={busy} onclick={removeImage}>Remove active image</button>{/if}</div>
				</div>
			{/if}
			{#if formError}<p class="text-sm text-error" role="alert">{formError}</p>{/if}
			<div class="flex flex-col-reverse justify-end gap-2 sm:flex-row"><button class="btn btn-ghost" disabled={busy} onclick={closeEditor}>Cancel</button><button class="btn btn-primary" disabled={busy || !editor.prompt.trim()} onclick={saveTask}>{busy ? "Saving…" : editor.taskId ? "Save new version" : "Create question"}</button></div>
		</div>
	</section>
{/if}

{#if loading}<div class="alert mt-4" role="status"><span class="loading loading-spinner loading-sm"></span>Loading question bank…</div>
{:else if data?.tasks.length}
	<div class="grid gap-4 lg:grid-cols-2">
		{#each data.tasks as task (task.id)}
			<article class="admin-panel">
				<div class="card-body gap-4 p-4 sm:p-5">
					<div class="flex flex-wrap items-center gap-2"><span class="badge badge-primary">Task {task.category}</span><span class="badge">{task.userId ? `Personal · ${task.ownerName ?? "account"}` : "System"}</span>{#if task.subcategory}<span class="badge badge-ghost">{getTaskSubcategoryLabel(task.subcategory)}</span>{/if}<span class="badge" class:badge-success={task.published} class:badge-warning={!task.published}>{task.deletedAt ? "Archived" : task.published ? "Shown" : "Hidden"}</span></div>
					{#if task.image}<img src={`/tasks/${task.id}/image`} alt="Question chart" class="max-h-48 w-full rounded-box bg-base-200/50 object-contain" loading="lazy" />{/if}
					<p class="line-clamp-4 whitespace-pre-wrap text-sm">{task.prompt}</p>
					<div class="text-xs text-base-content/60">{task.topic ?? "No topic"} · {task.difficulty ?? "No difficulty"} · updated {task.updatedAt.toLocaleString()}</div>
					<div class="flex flex-wrap justify-end gap-2 border-t border-base-content/10 pt-3">
						{#if task.deletedAt}
							<button class="btn btn-sm" disabled={busy} onclick={() => { if (window.confirm("Restore this archived question?")) void mutate(() => restoreAdminTask({ taskId: task.id }), "Question restored as hidden."); }}>Restore</button>
						{:else}
							<button class="btn btn-sm" disabled={busy || (task.category === "1" && !task.image)} onclick={() => void mutate(() => setAdminTaskVisibility({ taskId: task.id, published: !task.published }), `Question ${task.published ? "hidden" : "shown"}.`)}>{task.published ? "Hide" : "Show"}</button>
							<button class="btn btn-outline btn-sm" disabled={busy} onclick={() => startEdit(task)}>Edit</button>
							<button class="btn btn-ghost btn-sm text-error" disabled={busy} onclick={() => { if (window.confirm("Remove this question from the active bank? Existing practice sessions keep their saved task version.")) void mutate(() => archiveAdminTask({ taskId: task.id }), "Question archived; existing sessions are preserved."); }}>Archive</button>
						{/if}
					</div>
				</div>
			</article>
		{/each}
	</div>
	<div class="mt-3 flex items-center justify-between text-sm"><span>{data.total} questions · page {data.page}</span><div class="join"><button class="btn join-item btn-sm" disabled={page <= 1} onclick={() => { page -= 1; void load(); }}>Previous</button><button class="btn join-item btn-sm" disabled={page * pageSize >= data.total} onclick={() => { page += 1; void load(); }}>Next</button></div></div>
{:else if !loading && !loadError}<div class="admin-panel p-8 text-center text-base-content/70">No questions in this view.</div>{/if}
