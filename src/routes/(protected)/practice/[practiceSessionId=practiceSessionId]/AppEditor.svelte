<script lang="ts">
	import { debounce } from "#lib/utils/debounce.ts";
	import { Pen, PenOff } from "@lucide/svelte";
	import type { WorkerLinter } from "harper.js";
	import { onDestroy, untrack } from "svelte";
	import Timer from "./Timer.svelte";
	import { saveTaskImage } from "./save-task-image.remote";
	import { openModal } from "#lib/components/Modal.svelte";
	import { page } from "$app/state";

	type Props = {
		class?: string;
		content: string;
		hasImage?: boolean;
		image?: Blob;
		isDirty?: boolean;
		canUnlock?: boolean;
		isUnlocked?: boolean;
		linters: WorkerLinter[];
		onPostContentChanged: () => Promise<void> | void;
		timer?: {
			endAt: number;
			onTimedUp: () => void;
		};
		title: string;
	};

	let {
		content = $bindable(""),
		image = $bindable(),
		isDirty = $bindable(false),
		isUnlocked = $bindable(true),
		...props
	}: Props = $props();

	let isReady = $state<boolean>(false);
	let currentState = $state<"Not saved" | "Saved" | "Saving">("Saved");

	const imagePreview = $derived(props.hasImage && image ? URL.createObjectURL(image) : undefined);

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

		saveTaskImage.submit();
	}

	const handlePostContentChangedDebounced = debounce(async () => {
		currentState = "Saving";
		await props.onPostContentChanged();
		currentState = "Saved";
		isDirty = false;
	}, 2000);

	async function handleContentChanged(newContent: string) {
		content = newContent;
		if (!isDirty) {
			isDirty = true;
			currentState = "Not saved";
			await handlePostContentChangedDebounced();
		}
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

<div class={["flex flex-col rounded-box border border-base-content/20 bg-base-100", props.class]}>
	<div class="flex items-center justify-between gap-1 p-2">
		<div class="flex items-center gap-2">
			<label class="swap" title={getLockSupportText()}>
				<input type="checkbox" bind:checked={isUnlocked} disabled={!props.canUnlock} />
				<Pen class="swap-on text-success" size="1em" />
				<PenOff class="swap-off text-error" size="1em" />
			</label>
			<div class="text-sm font-bold text-primary uppercase">{props.title}</div>
		</div>

		<div class="flex items-center gap-2">
			<!-- Add image button -->
			{#if props.hasImage && isUnlocked}
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
			{/if}

			<!-- Timer Display -->
			{#if props.timer}
				<Timer {...props.timer} />
			{/if}

			<!-- Working indicator -->
			<div class="flex min-w-17 items-center justify-end gap-1 text-xs">
				<div
					class={[
						"status",
						currentState === "Not saved" && "status-error",
						currentState === "Saving" && "animate-bounce status-warning",
						currentState === "Saved" && "status-success"
					]}>
				</div>
				<span
					class={[
						"font-semibold",
						currentState === "Not saved" && "text-error",
						currentState === "Saving" && "text-warning",
						currentState === "Saved" && "text-success"
					]}>
					{currentState}
				</span>
			</div>
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
					onReady={handleReady}
					onChange={handleContentChanged} />

				<!-- Image preview -->
				{#if props.hasImage && isReady && imagePreview}
					<div class="flex min-h-fit flex-1 flex-col items-center justify-center gap-2">
						<img src={imagePreview} alt="Task" class="placeholder max-w-full" />
					</div>
				{/if}
			</div>
		{/await}
	{/if}
</div>
