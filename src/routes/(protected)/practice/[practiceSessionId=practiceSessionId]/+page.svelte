<script lang="ts">
	import { page } from "$app/state";
	import { WorkerLinter } from "harper.js";
	import { onMount, untrack } from "svelte";
	import type { TaskCategory } from "#lib/domain/task-category.js";
	import PreventLeaving from "#lib/components/PreventLeaving.svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import { getResponseIdealWordCount } from "#lib/domain/task-response.js";
	import { setTimedUpAction } from "#lib/remotes/command/set-timed-up-action.remote.js";
	import { getLinters } from "#lib/components/harper-editor/linters.js";
	import DocumentBar from "./DocumentBar.svelte";
	import ResponseEditor from "./ResponseEditor.svelte";
	import TaskEditor from "./TaskEditor.svelte";
	import TutorPanel from "./TutorPanel.svelte";

	const { data } = $props();

	let category = $state<TaskCategory>(untrack(() => data.task.category));
	let prompt = $state<string>(untrack(() => data.task.prompt));
	let response = $state<string>(untrack(() => data.response));
	let imageName = $state<string | undefined>(untrack(() => data.task.imageName ?? undefined));

	let linters = $state<WorkerLinter[]>([]);
	let isPromptDirty = $state<boolean>(false);
	let isResponseDirty = $state<boolean>(false);
	let isChatBusy = $state<boolean>(false);
	let isEvaluationBusy = $state<boolean>(false);
	let showTask = $state<boolean>(true);
	let showAssistant = $state<boolean>(true);

	type EditorHandle = { saveNow: () => Promise<void> };
	let taskEditor = $state<EditorHandle>();
	let responseEditor = $state<EditorHandle>();

	const canSave = $derived(isPromptDirty || isResponseDirty);

	async function handleSaveAll() {
		await Promise.all([taskEditor?.saveNow(), responseEditor?.saveNow()]);
	}

	let timedUpAction = $derived(data.timedUpAction);

	const minWords = $derived(getResponseIdealWordCount(category));

	const responsePlaceholder = $derived(
		category === "1"
			? `Describe the visual in at least ${minWords} words...`
			: `Write your essay in at least ${minWords} words...`
	);

	const practiceSessionId = $derived(page.params.practiceSessionId!);

	const practiceSessionContext = $derived({ category, prompt, response, imageName });

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
						practiceSessionId,
						timedUpAction: "stop"
					});
				}
			},
			title: "Time's Up!"
		});
	}

	onMount(async () => {
		linters = await getLinters();
	});
</script>

<svelte:head>
	<title>{data.title} | IELTS Writing Practice Platform</title>
	<meta name="description" content={data.title} />
</svelte:head>

<PreventLeaving canLeave={!isPromptDirty && !isResponseDirty && !isEvaluationBusy && !isChatBusy} />

<main
	id="main-content"
	class="flex flex-1 flex-col gap-2 bg-base-100 p-2 lg:flex-row lg:overflow-y-hidden">
	<section class="flex flex-1 flex-col gap-2 lg:flex-3 lg:overflow-y-auto xl:flex-2">
		<DocumentBar
			{category}
			{practiceSessionId}
			practiceSessionName={data.title}
			timer={data.type === "timed" ? { endAt: data.endAt, onTimedUp: handleTimedUp } : undefined}
			onSave={handleSaveAll}
			{canSave}
			bind:showTask
			bind:showAssistant />

		{#if showTask}
			<TaskEditor
				class="flex-1"
				title="Task"
				taskId={data.task.id}
				allowImage={category === "1"}
				bind:this={taskEditor}
				bind:content={prompt}
				bind:imageName
				bind:isDirty={isPromptDirty}
				canUnlock={data.task.isOwner}
				isUnlocked={data.task.isOwner && !response && timedUpAction !== "stop"}
				{linters} />
		{/if}

		<ResponseEditor
			class="flex-3"
			title="Your response"
			{practiceSessionId}
			bind:this={responseEditor}
			bind:content={response}
			bind:isDirty={isResponseDirty}
			isUnlocked={timedUpAction !== "stop"}
			wordTarget={minWords}
			placeholder={responsePlaceholder}
			{linters} />
	</section>

	{#if showAssistant}
		<aside class="top-0 basis-[75dvh] overflow-y-auto lg:sticky lg:flex-1">
			<TutorPanel
				{practiceSessionId}
				{practiceSessionContext}
				evaluation={data.evaluation}
				messages={data.chatMessages}
				bind:isChatBusy
				bind:isEvaluationBusy />
		</aside>
	{/if}
</main>
