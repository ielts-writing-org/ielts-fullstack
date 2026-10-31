<script lang="ts">
	import { debounce } from "#lib/utils/debounce.ts";
	import { Pen, PenOff, Trash } from "@lucide/svelte";
	import type { WorkerLinter } from "harper.js";
	import { onDestroy, untrack } from "svelte";
	import { saveTaskImage } from "./save-task-image.remote";
	import { clearTaskImage } from "./clear-task-image.remote";
	import { openModal } from "#lib/components/Modal.svelte";
	import { page } from "$app/state";

	type Props = {
		class?: string;
		content: string;
		hasImage?: boolean;
		image?: Blob;
		imageName?: string;
		isDirty?: boolean;
		canUnlock?: boolean;
		isUnlocked?: boolean;
		linters: WorkerLinter[];
		onPostContentChanged: () => Promise<void> | void;
		title: string;
		/** Minimum acceptable word count, surfaced in the editor status bar. */
		wordTarget?: number;
		/** Placeholder shown while the document is empty. */
		placeholder?: string;
	};

	let {
		content = $bindable(""),
		image = $bindable(),
		imageName = $bindable(),
		isDirty = $bindable(false),
		isUnlocked = $bindable(true),
		...props
	}: Props = $props();

	let isReady = $state<boolean>(false);
	let currentState = $state<"Not saved" | "Saved" | "Saving" | "Failed">("Saved");

	const imagePreview = $derived(props.hasImage && image ? URL.createObjectURL(image) : undefined);

	/** Save state surfaced in the editor status bar. */
	const saveState = $derived(
		currentState === "Not saved"
			? ("unsaved" as const)
			: currentState === "Saving"
				? ("saving" as const)
				: currentState === "Saved"
					? ("saved" as const)
					: ("failed" as const)
	);

	/** Force an immediate save, bypassing the autosave debounce (Ctrl/Cmd + S or the toolbar button). */
	export async function saveNow() {
		if (!isDirty) {
			return;
		}

		currentState = "Saving";
		try {
			await props.onPostContentChanged();
			currentState = "Saved";
			isDirty = false;
		} catch {
			// Keep the content dirty so it is retried by the next autosave or the
			// explicit Retry button in the status bar.
			currentState = "Failed";
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
			event.preventDefault();
			void saveNow();
		}
	}

	async function handleAddImage(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const files = e.currentTarget.files;
		if (!files) {
			return;
		}

		const file = files[0];

		if (imagePreview) {
			URL.revokeObjectURL(imagePreview);
		}

		image = file;

		await saveTaskImage.submit();
		imageName = saveTaskImage.result?.imageName;
	}

	async function handleRemoveImage() {
		if (imagePreview) {
			URL.revokeObjectURL(imagePreview);
		}

		await clearTaskImage({ taskId: page.data.task.id });
		image = undefined;
	}

	const handlePostContentChangedDebounced = debounce(async () => {
		currentState = "Saving";
		try {
			await props.onPostContentChanged();
			currentState = "Saved";
			isDirty = false;
		} catch {
			currentState = "Failed";
		}
	}, 2000);

	async function handleContentChanged(newContent: string) {
		content = newContent;
		isDirty = true;
		if (currentState !== "Saving") {
			currentState = "Not saved";
		}
		// Rescheduling on every keystroke keeps the autosave 2s behind the last
		// keystroke, even after a failed save.
		handlePostContentChangedDebounced();
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

	onDestroy(() => {
		if (imagePreview) {
			URL.revokeObjectURL(imagePreview);
		}
	});

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

		<div class="flex items-center gap-2">
			<!-- Image controls -->
			{#if props.hasImage && isUnlocked}
				<div class="flex items-center gap-1">
					<form {...saveTaskImage} class="contents" enctype="multipart/form-data">
						<input {...saveTaskImage.fields.taskId.as("hidden", page.data.task.id)} />
						<label class={["btn btn-primary btn-xs", image ? "btn-outline" : "btn-primary"]}>
							<input
								{...saveTaskImage.fields.image.as("file")}
								class="hidden"
								accept="image/*"
								onchange={handleAddImage} />
							{image ? "Change" : "Add an"} image
						</label>
					</form>
					{#if image}
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
	</div>
	{#if props.linters.length}
		{#if !isReady}
			<div class="flex h-full flex-col items-center justify-center gap-2">
				<span class="loading loading-infinity text-primary"></span>
				<p class="text-sm">Loading editor...</p>
			</div>
		{/if}
		{#await import("#lib/components/harper-editor/Editor.svelte") then { default: Editor }}
			<div class="flex flex-1 flex-col gap-2 lg:flex-row">
				<Editor
					linters={props.linters}
					{content}
					isEditable={isUnlocked}
					wordTarget={props.wordTarget ?? 0}
					placeholder={props.placeholder}
					{saveState}
					onRetrySave={saveNow}
					onReady={handleReady}
					onChange={handleContentChanged} />

				<!-- Image preview -->
				{#if props.hasImage && isReady && imagePreview}
					<div class="flex min-h-fit flex-1 flex-col items-center justify-center gap-2">
						<img src={imagePreview} alt={imageName} class="placeholder max-w-full" />
					</div>
				{/if}
			</div>
		{/await}
	{/if}
</div>
