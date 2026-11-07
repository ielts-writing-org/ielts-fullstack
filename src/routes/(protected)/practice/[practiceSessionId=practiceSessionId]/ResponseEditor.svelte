<script lang="ts">
	import { Pen, PenOff } from "@lucide/svelte";
	import type { WorkerLinter } from "harper.js";
	import Editor from "#lib/components/harper-editor/Editor.svelte";
	import { savePracticeResponse } from "#lib/remotes/command/save-practice-response.remote.js";
	import { EditorSaver } from "./save-state.svelte.ts";

	type Props = {
		class?: string;
		title: string;
		practiceSessionId: string;
		content: string;
		isDirty?: boolean;
		isUnlocked?: boolean;
		linters: WorkerLinter[];
		/** Minimum acceptable word count, surfaced in the editor status bar. */
		wordTarget?: number;
		/** Placeholder shown while the document is empty. */
		placeholder?: string;
	};

	let {
		content = $bindable(""),
		isDirty = $bindable(false),
		isUnlocked = $bindable(true),
		...props
	}: Props = $props();

	let isReady = $state<boolean>(false);

	const saver = new EditorSaver(async () => {
		await savePracticeResponse({
			practiceSessionId: props.practiceSessionId,
			response: content
		});
		isDirty = false;
	});

	const saveState = $derived(saver.status);

	/** Force an immediate save, bypassing the autosave debounce (Ctrl/Cmd + S or the toolbar button). */
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

	function handleContentChanged(newContent: string) {
		content = newContent;
		isDirty = true;
		// Rescheduling on every keystroke keeps the autosave 2s behind the last
		// keystroke, even after a failed save.
		saver.scheduleSaving();
	}

	function handleReady() {
		isReady = true;
	}

	function getLockSupportText() {
		return isUnlocked ? "Lock editor" : "Unlock editor";
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class={["flex flex-col rounded-box border border-base-content/20 bg-base-100", props.class]}>
	<div class="flex items-center justify-between gap-1 p-2">
		<div class="flex items-center gap-2">
			<label class="swap" title={getLockSupportText()}>
				<input
					type="checkbox"
					bind:checked={isUnlocked}
					aria-label={isUnlocked ? "Lock editor" : "Unlock editor"} />
				<Pen class="swap-on text-success" size="1em" />
				<PenOff class="swap-off text-error" size="1em" />
			</label>
			<div class="text-sm font-bold text-primary uppercase">{props.title}</div>
		</div>
	</div>
	{#if !isReady}
		<div class="flex h-full flex-col items-center justify-center gap-2">
			<span class="loading loading-infinity text-primary"></span>
			<p class="text-sm">Loading editor...</p>
		</div>
	{/if}
	<div class="flex flex-1 flex-col">
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
	</div>
</div>
