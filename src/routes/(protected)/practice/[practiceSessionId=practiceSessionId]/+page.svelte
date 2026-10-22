<script lang="ts">
	import { beforeNavigate } from "$app/navigation";
	import { page } from "$app/state";
	import { Dialect, WorkerLinter } from "harper.js";
	import { onDestroy, onMount, untrack } from "svelte";
	import type { ChatMessage } from "#lib/schemas/chat-message.ts";
	import type { Evaluation } from "#lib/schemas/evaluation.ts";
	import type { PracticeSessionContext } from "#lib/schemas/task-context.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import AppEditor from "./AppEditor.svelte";
	import ChatPanel from "./chat/ChatPanel.svelte";
	import EvaluationPanel from "./evaluate/EvaluationPanel.svelte";
	import { saveTaskPrompt } from "./save-task-prompt.remote.js";
	import { saveTaskResponse } from "./save-task-response.remote.js";
	import { setTimedUpAction } from "./set-timed-up-action.remote.js";

	const { data } = $props();

	type PracticeContext = {
		practiceSessionContext: PracticeSessionContext;
		evaluation: Evaluation | undefined;
		messages: ChatMessage[];
	};

	const { practiceSessionContext, evaluation, messages } = $state<PracticeContext>({
		practiceSessionContext: {
			...untrack(() => data).task,
			response: untrack(() => data).response
		},
		evaluation: untrack(() => data).evaluation,
		messages: []
	});

	const linters = $state<Array<WorkerLinter>>([]);
	let isPromptDirty = $state<boolean>(false);
	let isResponseDirty = $state<boolean>(false);

	let timedUpAction = $derived(data.timedUpAction);
	const isDirty = $derived<boolean>(isPromptDirty || isResponseDirty);

	async function handleSaveTaskPrompt() {
		await saveTaskPrompt({
			practiceSessionId: page.params.practiceSessionId!,
			prompt: practiceSessionContext.prompt
		});
	}

	async function handleSaveTaskResponse() {
		await saveTaskResponse({
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
				onclick: () => {
					setTimedUpAction({
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

	beforeNavigate(({ cancel, shallow }) => {
		const canLeave = shallow || !isDirty;
		if (!canLeave && !window.confirm("You have unsaved changes. Leave anyway?")) {
			cancel();
		}
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

<svelte:window on:beforeunload={(e) => isDirty && e.preventDefault()} />

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
		<div role="tablist" class="tabs tabs-lift h-full">
			<label class="tab [--tab-border-color:var(--color-base-content)]/20">
				<input type="radio" name="tab" aria-label="Tab Evaluation" role="tab" defaultChecked />
				Evaluation
			</label>

			<div class="tab-content border-base-content/20">
				<EvaluationPanel
					practiceSessionId={page.params.practiceSessionId!}
					{practiceSessionContext}
					{evaluation} />
			</div>

			<label class="tab [--tab-border-color:var(--color-base-content)]/20">
				<input type="radio" name="tab" aria-label="Tab Chat" role="tab" />
				Chat
			</label>
			<div class="tab-content border-base-content/20">
				<ChatPanel taskContext={practiceSessionContext} {evaluation} {messages} />
			</div>
		</div>
	</aside>
</main>
