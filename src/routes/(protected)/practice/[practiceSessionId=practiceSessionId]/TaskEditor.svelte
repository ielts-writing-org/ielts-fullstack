<script lang="ts">
	import { untrack } from "svelte";
	import { Pen, PenOff, Trash } from "@lucide/svelte";
	import type { WorkerLinter } from "harper.js";
	import { openModal } from "#lib/components/Modal.svelte";
	import Editor from "#lib/components/harper-editor/Editor.svelte";
	import { getAllowedImageMimeTypes } from "#lib/domain/task-image.ts";
	import { saveTaskPrompt } from "#lib/remotes/command/save-task-prompt.remote.js";
	import { saveTaskImage } from "#lib/remotes/form/save-task-image.remote.ts";
	import { clearTaskImage } from "#lib/remotes/command/clear-task-image.remote.ts";
	import { EditorSaver } from "./save-state.svelte.ts";
	import { getImageUrl } from "#lib/utils/paths.ts";

	type Props = {
		class?: string;
		title: string;
		taskId: string;
		content: string;
		imageName?: string;
		isDirty?: boolean;
		canUnlock?: boolean;
		isUnlocked?: boolean;
		linters: WorkerLinter[];
	};

	let {
		content = $bindable(""),
		imageName = $bindable(),
		isDirty = $bindable(false),
		isUnlocked = $bindable(true),
		...props
	}: Props = $props();

	let isReady = $state<boolean>(false);

	const saver = new EditorSaver(async () => {
		await saveTaskPrompt({ taskId: props.taskId, prompt: content });
		isDirty = false;
	});

	const saveState = $derived(saver.status);

	export async function saveNow() {
		if (!isDirty) {
			return;
		}

		if (await saver.saveNow()) {
			isDirty = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
			event.preventDefault();
			void saveNow();
		}
	}

	async function handleAddImage() {
		const file = saveTaskImage.fields.image.value();

		if (!file) {
			return;
		}

		await saveTaskImage.submit();
		imageName = saveTaskImage.result?.imageName;
	}

	async function handleRemoveImage() {
		await clearTaskImage({ taskId: props.taskId });
		imageName = undefined;
	}

	function handleContentChanged(newContent: string) {
		content = newContent;
		isDirty = true;
		saver.scheduleSaving();
	}

	function handleReady() {
		isReady = true;
	}

	function getLockSupportText() {
		if (!props.canUnlock) {
			return "You do not have permission to edit";
		}

		return isUnlocked ? "Lock editor" : "Unlock editor";
	}

	$effect(() => {
		const issues = saveTaskImage.fields.image.issues();
		if (issues) {
			untrack(() => {
				openModal({
					title: "Cannot upload image",
					content: issues[0].message,
					primaryButton: "Close"
				});
			});
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class={["flex flex-col rounded-box border border-base-content/20 bg-base-100", props.class]}>
	<div class="flex items-center justify-between gap-1 p-2">
		<div class="flex items-center gap-2">
			<label class="swap" title={getLockSupportText()}>
				<input
					type="checkbox"
					bind:checked={isUnlocked}
					disabled={!props.canUnlock}
					aria-label={isUnlocked ? "Lock editor" : "Unlock editor"} />
				<Pen class="swap-on text-success" size="1em" />
				<PenOff class="swap-off text-error" size="1em" />
			</label>
			<div class="text-sm font-bold text-primary uppercase">{props.title}</div>
		</div>

		<!-- Image controls -->
		{#if isUnlocked}
			<div class="flex items-center gap-1">
				<form {...saveTaskImage} class="contents" enctype="multipart/form-data">
					<input {...saveTaskImage.fields.taskId.as("hidden", props.taskId)} />
					<label class={["btn btn-primary btn-xs", imageName ? "btn-outline" : "btn-primary"]}>
						<input
							{...saveTaskImage.fields.image.as("file")}
							class="hidden"
							accept={getAllowedImageMimeTypes().join(",")}
							onchange={handleAddImage} />
						{imageName ? "Change" : "Add an"} image
					</label>
				</form>
				{#if imageName}
					<button
						class="btn btn-ghost text-error btn-xs"
						title="Remove image"
						aria-label="Remove task image"
						disabled={clearTaskImage.pending > 0}
						onclick={handleRemoveImage}>
						<Trash size="1em" />
						Remove image
					</button>
				{/if}
			</div>
		{/if}
	</div>
	{#if !isReady}
		<div class="flex h-full flex-col items-center justify-center gap-2">
			<span class="loading loading-infinity text-primary"></span>
			<p class="text-sm">Loading editor...</p>
		</div>
	{/if}
	<div class="flex flex-1 flex-col gap-2 lg:flex-row">
		<Editor
			name="task-editor"
			linters={props.linters}
			{content}
			isEditable={isUnlocked}
			{saveState}
			onRetrySave={saveNow}
			onReady={handleReady}
			onChange={handleContentChanged} />

		<!-- Image preview -->
		{#if isReady && imageName}
			<div class="flex min-h-fit flex-1 flex-col items-center justify-center gap-2">
				<img
					src={getImageUrl(imageName)}
					alt={imageName}
					class="placeholder max-w-full rounded-br-box" />
			</div>
		{/if}
	</div>
</div>
