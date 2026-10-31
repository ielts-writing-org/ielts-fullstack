<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import type { TaskCategory } from "#lib/schemas/task-category.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import { minWordsFor, timeLimitMinutesFor } from "#lib/utils/ielts.ts";
	import {
		Eye,
		EyeOff,
		Keyboard,
		Lightbulb,
		Maximize2,
		Minimize2,
		PenLine,
		Save,
		Trash,
		Undo2
	} from "@lucide/svelte";
	import ChangeSessionName from "../../../ChangeSessionName.svelte";
	import { deletePracticeSession } from "../../../delete-practice-session.remote";
	import Timer from "./Timer.svelte";

	type Props = {
		category: TaskCategory;
		timer?: {
			endAt: number;
			onTimedUp: () => void;
		};
		showTask?: boolean;
		showAssistant?: boolean;
		/** Saves all dirty editor content; shown when provided. */
		onSave?: () => void | Promise<void>;
		/** Whether there is unsaved content to save. */
		canSave?: boolean;
	};

	let {
		category,
		timer,
		showTask = $bindable(true),
		showAssistant = $bindable(true),
		onSave,
		canSave = true
	}: Props = $props();

	let megamenu = $state<HTMLElement>();

	const minWords = $derived(minWordsFor(category));
	const timeLimit = $derived(timeLimitMinutesFor(category));
	const isFocusMode = $derived(!showTask && !showAssistant);

	async function run(action: () => void | Promise<void>) {
		document.querySelectorAll<HTMLElement>("div [popover]").forEach((e) => e.hidePopover());
		await action();
	}

	function handleRename() {
		openModal({
			title: "Rename practice session",
			content: { component: ChangeSessionName }
		});
	}

	function handleDelete() {
		openModal({
			title: { text: "Delete practice session", color: "error" },
			content: `"${page.data.pageName}" and its evaluation and chat will be permanently removed. This cannot be undone.`,
			primaryButton: {
				text: "Delete",
				color: "error",
				style: "ghost",
				onclick: async () => {
					await deletePracticeSession({
						practiceSessionId: page.params.practiceSessionId!
					});
					await goto(resolve("/(protected)"));
				}
			},
			secondaryButton: {
				text: "Cancel",
				color: "primary"
			}
		});
	}

	function handleBackToPreviousPage() {
		history.back();
	}

	function handleToggleTask() {
		showTask = !showTask;
	}

	function handleToggleAssistant() {
		showAssistant = !showAssistant;
	}

	async function handleFocusMode() {
		if (document.fullscreenElement) {
			await document.exitFullscreen();
			showAssistant = true;
		} else {
			await document.querySelector("main")?.requestFullscreen();
			showAssistant = false;
		}
	}

	function handleWritingTips() {
		openModal({
			title: "Writing tips",
			content: { snippet: tipsSnippet },
			primaryButton: "Close"
		});
	}

	function handleShortcuts() {
		openModal({
			title: "Keyboard shortcuts",
			content: { snippet: shortcutsSnippet },
			primaryButton: "Close"
		});
	}
</script>

<div
	class="z-5 flex flex-wrap items-center gap-2 rounded-box border border-base-content/20 bg-base-100 px-2 py-1.5 not-lg:sticky not-lg:top-(--app-header-height) lg:sticky lg:top-0"
	aria-label="Practice toolbar">
	<nav class="megamenu megamenu-sm" aria-label="Practice menu" bind:this={megamenu}>
		<span class="megamenu-active"></span>

		<button popovertarget="practice-menu_file">File</button>
		<div id="practice-menu_file" popover>
			<ul class="menu">
				<li>
					<button onclick={() => run(handleRename)}>
						<PenLine size="1em" />
						Rename
					</button>
				</li>
				<li>
					<button class="text-error" onclick={() => run(handleDelete)}>
						<Trash size="1em" />
						Delete
					</button>
				</li>
				<li class="mt-1 border-t border-base-content/10 pt-1">
					<button onclick={() => run(handleBackToPreviousPage)}>
						<Undo2 size="1em" />
						Back to previous page
					</button>
				</li>
			</ul>
		</div>

		<button popovertarget="practice-menu_view">View</button>
		<div id="practice-menu_view" popover>
			<ul class="menu">
				<li>
					<button onclick={() => run(handleToggleTask)}>
						{#if showTask}
							<EyeOff size="1em" />
							Hide task panel
						{:else}
							<Eye size="1em" />
							Show task panel
						{/if}
					</button>
				</li>
				<li>
					<button onclick={() => run(handleToggleAssistant)}>
						{#if showAssistant}
							<EyeOff size="1em" />
							Hide tutor panel
						{:else}
							<Eye size="1em" />
							Show tutor panel
						{/if}
					</button>
				</li>
				<li>
					<button onclick={() => run(handleFocusMode)}>
						{#if isFocusMode}
							<Minimize2 size="1em" />
							Exit focus mode
						{:else}
							<Maximize2 size="1em" />
							Focus mode
						{/if}
					</button>
				</li>
			</ul>
		</div>

		<button popovertarget="practice-menu_help">Help</button>
		<div id="practice-menu_help" popover>
			<ul class="menu">
				<li>
					<button onclick={() => run(handleWritingTips)}>
						<Lightbulb size="1em" />
						Writing tips
					</button>
				</li>
				<li>
					<button onclick={() => run(handleShortcuts)}>
						<Keyboard size="1em" />
						Keyboard shortcuts
					</button>
				</li>
			</ul>
		</div>
	</nav>

	{#if onSave}
		<button
			class="btn btn-ghost btn-sm gap-1.5"
			disabled={!canSave}
			title="Save now (Ctrl+S)"
			onclick={onSave}>
			<Save class="size-4" />
			Save
			<kbd class="kbd kbd-sm hidden lg:inline">Ctrl S</kbd>
		</button>
	{/if}

	<span class="flex-1"></span>

	{#if timer}
		<Timer {...timer} />
	{/if}
</div>

{#snippet tipsSnippet()}
	<div class="space-y-3 text-sm">
		{#if category === "1"}
			<p>
				<span class="font-semibold">
					Task 1 &mdash; at least {minWords} words in {timeLimit} minutes.
				</span>
				Write 3&ndash;4 paragraphs: paraphrase the question in the introduction, give a clear overview
				of the main trends or features, then use two body paragraphs with specific data (figures, comparisons,
				dates). Do not give opinions.
			</p>
		{:else}
			<p>
				<span class="font-semibold">
					Task 2 &mdash; at least {minWords} words in {timeLimit} minutes.
				</span>
				Use four paragraphs: an introduction that states your position, two body paragraphs each with
				one main idea plus an example, and a conclusion. Plan for ~5 minutes and reserve ~5 minutes to
				check.
			</p>
		{/if}
		<p class="text-base-content/75">
			The editor highlights spelling and grammar problems automatically &mdash; watch the problem
			count in the status bar and keep your answer above the word minimum.
		</p>
	</div>
{/snippet}

{#snippet shortcutsSnippet()}
	<div class="space-y-2 text-sm">
		<div class="space-y-1">
			<p>
				Save:
				<kbd class="kbd kbd-sm">Ctrl</kbd>
				/
				<kbd class="kbd kbd-sm">Cmd</kbd>
				+
				<kbd class="kbd kbd-sm">S</kbd>
				or the
				<span class="font-semibold">Save</span>
				button in the toolbar
			</p>
			<p class="text-xs text-base-content/75">
				This saves your task prompt and your answer. Your answer also saves automatically a moment
				after you stop typing.
			</p>
		</div>

		<p>
			Undo / Redo:
			<kbd class="kbd kbd-sm">Ctrl</kbd>
			+
			<kbd class="kbd kbd-sm">Z</kbd>
			/
			<kbd class="kbd kbd-sm">Y</kbd>
		</p>
	</div>
{/snippet}
