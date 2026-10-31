<script lang="ts">
	import { page } from "$app/state";
	import { Dialect, WorkerLinter } from "harper.js";
	import { onDestroy, onMount, untrack } from "svelte";
	import type { TaskCategory } from "#lib/schemas/task-category.js";
	import type { ChatMessage } from "#lib/schemas/chat-message.ts";
	import type { Evaluation } from "#lib/schemas/evaluation.ts";
	import PreventLeaving from "#lib/components/PreventLeaving.svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import { minWordsFor } from "#lib/utils/ielts.ts";
	import AppEditor from "./AppEditor.svelte";
	import DocumentBar from "./DocumentBar.svelte";
	import Tabs from "./Tabs.svelte";
	import { saveTaskPrompt } from "./save-task-prompt.remote.js";
	import { savePracticeResponse } from "./save-practice-response.remote.js";
	import { setTimedUpAction } from "./set-timed-up-action.remote.js";

	const { data } = $props();

	let category = $state<TaskCategory>(untrack(() => data.task.category));
	let prompt = $state<string>(untrack(() => data.task.prompt));
	let response = $state<string>(untrack(() => data.response));
	let image = $state<File | undefined>(untrack(() => data.task.image));
	let imageName = $state<string | undefined>(untrack(() => data.task.imageName ?? undefined));
	let evaluation = $state<Evaluation | undefined>(untrack(() => data.evaluation));
	let messages = $state<ChatMessage[]>(untrack(() => data.chatMessages));

	const linters = $state<Array<WorkerLinter>>([]);
	let isPromptDirty = $state<boolean>(false);
	let isResponseDirty = $state<boolean>(false);
	let isChatBusy = $state<boolean>(false);
	let isEvaluationBusy = $state<boolean>(false);
	let showTask = $state<boolean>(true);
	let showAssistant = $state<boolean>(true);

	let timedUpAction = $derived(data.timedUpAction);

	const minWords = $derived(minWordsFor(category));

	const responsePlaceholder = $derived(
		category === "1"
			? `Describe the visual in at least ${minWords} words...`
			: `Write your essay in at least ${minWords} words...`
	);

	async function handleSaveTaskPrompt() {
		await saveTaskPrompt({
			taskId: data.task.id,
			prompt: prompt
		});
	}

	async function handleSaveTaskResponse() {
		await savePracticeResponse({
			practiceSessionId: page.params.practiceSessionId!,
			response: response
		});
	}

	function handleTimedUp() {
		if (timedUpAction) {
			return;
		}

		timedUpAction = "stop";
		openModal({
			content:
				"The time for this task has ended. You should stop writing and hand off the writing to the AI Evaluator.",
			primaryButton: {
				text: "I got it!",
				color: "primary",
				onclick: async () => {
					await setTimedUpAction({
						practiceSessionId: page.params.practiceSessionId!,
						timedUpAction: "stop"
					});
				}
			},
			title: "Time's Up!"
		});
	}

	onMount(async () => {
		const { slimBinary: binary } = await import("harper.js/slimBinary");
		linters.push(new WorkerLinter({ binary, dialect: Dialect.American }));
		linters.push(new WorkerLinter({ binary, dialect: Dialect.British }));
	});

	onDestroy(() => {
		linters.forEach((l) => l.dispose());
		linters.length = 0;
	});
</script>

<svelte:head>
	<title>{data.title} | IELTS Writing Practice Platform</title>
	<meta name="description" content={data.title} />
</svelte:head>

<PreventLeaving by={isPromptDirty || isResponseDirty || isEvaluationBusy || isChatBusy} />

<main id="main-content" class="flex flex-1 flex-col gap-2 bg-base-100 p-2 lg:flex-row lg:overflow-y-hidden">
	<section class="flex flex-1 flex-col gap-2 lg:flex-3 lg:overflow-y-auto xl:flex-2">
		<DocumentBar
			{category}
			timer={data.type === "timed" ? { endAt: data.endAt, onTimedUp: handleTimedUp } : undefined}
			bind:showTask
			bind:showAssistant />

		{const hasImage = category === "1"}
		{#if showTask}
			<AppEditor
				class="flex-1"
				title="Task"
				{hasImage}
				bind:image
				bind:imageName
				bind:content={prompt}
				bind:isDirty={isPromptDirty}
				canUnlock={data.task.isOwner}
				isUnlocked={data.task.isOwner && !response && timedUpAction !== "stop"}
				{linters}
				onPostContentChanged={handleSaveTaskPrompt} />
		{/if}

		<AppEditor
			class="flex-3"
			title="Your response"
			bind:content={response}
			bind:isDirty={isResponseDirty}
			canUnlock={true}
			isUnlocked={timedUpAction !== "stop"}
			wordTarget={minWords}
			placeholder={responsePlaceholder}
			{linters}
			onPostContentChanged={handleSaveTaskResponse} />
	</section>

	{#if showAssistant}
		<aside class="top-0 basis-[75dvh] overflow-y-auto lg:sticky lg:flex-1">
			<Tabs
				practiceSessionId={page.params.practiceSessionId!}
				practiceSessionContext={{
					category,
					prompt,
					response,
					image,
					imageName
				}}
				bind:evaluation
				bind:messages
				bind:isChatBusy
				bind:isEvaluationBusy />
		</aside>
	{/if}
</main>
