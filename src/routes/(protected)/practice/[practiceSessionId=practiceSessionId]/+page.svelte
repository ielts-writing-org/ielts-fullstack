<script lang="ts">
	import { page } from "$app/state";
	import { Dialect, WorkerLinter } from "harper.js";
	import { onDestroy, onMount } from "svelte";
	import type { ChatMessage } from "#lib/schemas/chat-message.ts";
	import type { Evaluation } from "#lib/schemas/evaluation.ts";
	import type { PracticeSessionContext } from "#lib/schemas/task-context.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import AppEditor from "./AppEditor.svelte";
	import Tabs from "./Tabs.svelte";
	import { saveTaskPrompt } from "./save-task-prompt.remote.js";
	import { savePracticeResponse } from "./save-practice-response.remote.js";
	import { setTimedUpAction } from "./set-timed-up-action.remote.js";
	import PreventLeaving from "#lib/components/PreventLeaving.svelte";

	const { data } = $props();

	type PracticeContext = {
		practiceSessionContext: PracticeSessionContext;
		evaluation: Evaluation | undefined;
		messages: ChatMessage[];
	};

	const { practiceSessionContext, evaluation, messages } = $derived<PracticeContext>({
		practiceSessionContext: {
			...data.task,
			response: data.response
		},
		evaluation: data.evaluation,
		messages: data.chatMessages
	});

	const linters = $state<Array<WorkerLinter>>([]);
	let isPromptDirty = $state<boolean>(false);
	let isResponseDirty = $state<boolean>(false);
	let isChatBusy = $state<boolean>(false);
	let isEvaluationBusy = $state<boolean>(false);

	let timedUpAction = $derived(data.timedUpAction);

	async function handleSaveTaskPrompt() {
		await saveTaskPrompt({
			taskId: data.task.id,
			prompt: practiceSessionContext.prompt
		});
	}

	async function handleSaveTaskResponse() {
		await savePracticeResponse({
			practiceSessionId: page.params.practiceSessionId!,
			response: practiceSessionContext.response
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
	<title>Task {data.task.category} | IELTS Writing Practice Platform</title>
	<meta name="description" content={data.pageName} />
</svelte:head>

<PreventLeaving by={isPromptDirty || isResponseDirty || isEvaluationBusy || isChatBusy} />

<main class="flex flex-1 flex-col gap-2 p-2 lg:flex-row lg:overflow-y-hidden">
	<section class="flex flex-1 flex-col gap-2 lg:flex-3 lg:overflow-y-auto xl:flex-2">
		{const hasImage = practiceSessionContext.category === "1"}
		<AppEditor
			class="flex-1"
			title="Task"
			{hasImage}
			bind:image={practiceSessionContext.image}
			timer={data.type === "timed" ? { endAt: data.endAt, onTimedUp: handleTimedUp } : undefined}
			bind:content={practiceSessionContext.prompt}
			bind:isDirty={isPromptDirty}
			canUnlock={data.task.isOwner}
			isUnlocked={data.task.isOwner && !practiceSessionContext.response && timedUpAction !== "stop"}
			{linters}
			onPostContentChanged={handleSaveTaskPrompt} />

		<AppEditor
			class="flex-3"
			title="Your response"
			bind:content={practiceSessionContext.response}
			bind:isDirty={isResponseDirty}
			canUnlock={true}
			isUnlocked={timedUpAction !== "stop"}
			{linters}
			onPostContentChanged={handleSaveTaskResponse} />
	</section>

	<aside class="top-0 basis-md overflow-y-auto lg:sticky lg:flex-1">
		<Tabs
			practiceSessionId={page.params.practiceSessionId!}
			{practiceSessionContext}
			{evaluation}
			{messages}
			{isChatBusy}
			{isEvaluationBusy} />
	</aside>
</main>
