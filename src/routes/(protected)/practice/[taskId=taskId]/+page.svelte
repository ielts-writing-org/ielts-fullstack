<script lang="ts">
	import { beforeNavigate } from "$app/navigation";
	import { Clock } from "@lucide/svelte";
	import { Lightbulb, Pilcrow } from "@lucide/svelte";
	import { Dialect, WorkerLinter } from "harper.js";
	import { onDestroy, onMount, untrack } from "svelte";
	import ChatPanel from "./chat/ChatPanel.svelte";
	import EvaluationPanel from "./evaluate/EvaluationPanel.svelte";
	import type { TaskContext } from "#lib/schemas/task-context.ts";
	import type { Evaluation } from "#lib/schemas/evaluation.ts";
	import type { ChatMessage } from "#lib/schemas/chat-message.ts";
	import { openModal } from "#lib/components/modal/Modal.svelte";

	const { data } = $props();

	type PracticeContext = {
		taskContext: TaskContext;
		evaluation?: Evaluation;
		messages: ChatMessage[];
	};

	const { taskContext, evaluation, messages } = $state<PracticeContext>({
		taskContext: untrack(() => data.task),
		messages: [],
		evaluation: undefined
	});

	// TODO: Prevent
	let isDirty = $state<boolean>(false);
	const linters = $state<Array<WorkerLinter>>([]);

	const taskImagePreview = $derived(
		taskContext.id === "1" && taskContext.image ? URL.createObjectURL(taskContext.image) : undefined
	);

	// Timer configuration: Task 1 = 20 min, Task 2 = 40 min
	const TASK_DURATIONS = {
		"1": 20 * 60, // 20 minutes in seconds
		"2": 40 * 60 // 40 minutes in seconds
	} as const;

	let timeRemaining = $state<number>(
		TASK_DURATIONS[taskContext.id as keyof typeof TASK_DURATIONS] ?? 0
	);
	let timerInterval = $state<ReturnType<typeof setInterval> | null>(null);
	let isTimerRunning = $state<boolean>(false);

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}

	function startTimer() {
		if (isTimerRunning) return;
		isTimerRunning = true;

		timerInterval = setInterval(() => {
			if (timeRemaining <= 1) {
				clearInterval(timerInterval!);
				timerInterval = null;
				isTimerRunning = false;
				openModal({
					title: "Time's Up!",
					content:
						"The time for this task has ended. Would you like to continue with extra time or stop?",
					primaryButton: {
						text: "Continue",
						action: () => handleTimeUpConfirm(true)
					},
					secondaryButton: {
						text: "Stop",
						action: () => handleTimeUpConfirm(false),
						color: "error",
						style: "ghost"
					}
				});
				timeRemaining = 0;
			} else timeRemaining -= 1;
		}, 1000);
	}

	function pauseTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		isTimerRunning = false;
	}

	function resetTimer() {
		pauseTimer();
		timeRemaining = TASK_DURATIONS[taskContext.id as keyof typeof TASK_DURATIONS] ?? 0;
	}

	async function handleTimeUpConfirm(confirmed: boolean) {
		if (confirmed) {
			// User wants to continue - reset timer or add extra time
			resetTimer();
			startTimer();
		} else {
			// User wants to stop - could navigate away or pause
			pauseTimer();
		}
	}

	async function handleAddImage(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		if (taskContext.id === "2") return;

		const files = e.currentTarget.files;
		if (!files) return;

		const file = files[0];

		if (taskImagePreview) {
			URL.revokeObjectURL(taskImagePreview);
		}

		taskContext.image = file;
	}

	onMount(async () => {
		const { slimBinary: binary } = await import("harper.js/slimBinary");
		linters.push(new WorkerLinter({ binary, dialect: Dialect.American }));
		linters.push(new WorkerLinter({ binary, dialect: Dialect.British }));

		startTimer();
	});

	beforeNavigate(({ cancel, shallow }) => {
		if (shallow) return;

		if (isDirty && !window.confirm("You have unsaved changes. Leave anyway?")) {
			cancel();
		}
	});

	onDestroy(() => {
		if (taskImagePreview) {
			URL.revokeObjectURL(taskImagePreview);
		}

		if (timerInterval) {
			clearInterval(timerInterval);
		}

		linters.forEach((l) => l.dispose());
		linters.length = 0;
	});
</script>

<svelte:head>
	<title>Task {data.task.id} | IELTS Writing Practice Platform</title>
	<meta name="description" content={data.pageTitle} />
</svelte:head>

<svelte:window on:beforeunload={(e) => isDirty && e.preventDefault()} />

<main class="flex flex-1 flex-col gap-2 p-2 lg:flex-row lg:overflow-y-hidden">
	<section class="flex flex-1 flex-col gap-2 lg:flex-3 lg:overflow-y-auto xl:flex-2">
		<div class="flex flex-1 flex-col rounded-box border border-base-content/20 bg-base-100">
			<div class="flex items-center justify-between gap-1 p-2 text-sm text-primary">
				<div class="flex items-center gap-1 text-sm text-primary">
					<Lightbulb size="1em" />
					<div class="font-semibold uppercase">Task</div>
				</div>

				<div class="flex items-center gap-2">
					{#if taskContext.id === "1"}
						<label class="btn btn-dash btn-primary btn-xs">
							<input type="file" class="hidden" accept="image/*" onchange={handleAddImage} />
							{taskContext.image ? "Change" : "Add an"} image
						</label>
					{/if}
					<!-- Timer Display -->
					<div
						class={[
							"badge rounded-field font-mono badge-primary",
							timeRemaining <= 60 ? "animate-pulse badge-error!" : "badge-dash"
						]}>
						<Clock size="1em" />
						<span>{formatTime(timeRemaining)}</span>
					</div>
				</div>
			</div>
			{#if linters.length}
				{let isReady = $state<boolean>(false)}
				{#if !isReady}
					<div class="flex h-full flex-col items-center justify-center gap-2">
						<span class="loading loading-bars text-primary"></span>
						<p class="text-sm">Loading editor...</p>
					</div>
				{/if}
				{#await import("#lib/components/harper-editor/Editor.svelte") then { default: Editor }}
					<div class="flex flex-1 flex-col gap-2 lg:flex-row">
						<Editor
							{linters}
							content={taskContext.prompt}
							onReady={() => (isReady = true)}
							onChange={(v) => (taskContext.prompt = v)} />

						{#if data.task.id === "1" && taskImagePreview}
							<div class="flex min-h-fit flex-1 items-center justify-center gap-2 overflow-hidden">
								<img src={taskImagePreview} alt="Task" class="placeholder max-w-full" />
							</div>
						{/if}
					</div>
				{/await}
			{/if}
		</div>

		<div class="flex flex-3 flex-col rounded-box border border-base-content/20 bg-base-100">
			<div class="flex items-center gap-1 p-2 text-sm text-primary">
				<Pilcrow size="1em" />
				<div class="font-semibold uppercase">Your response</div>
			</div>
			{#if linters.length}
				{let isReady = $state<boolean>(false)}
				{#if !isReady}
					<div class="flex h-full flex-col items-center justify-center gap-2">
						<span class="loading loading-bars text-primary"></span>
						<p class="text-sm">Loading editor...</p>
					</div>
				{/if}
				{#await import("#lib/components/harper-editor/Editor.svelte") then { default: Editor }}
					<Editor
						{linters}
						content={taskContext.response}
						onReady={() => (isReady = true)}
						onChange={(v) => (taskContext.response = v)} />
				{/await}
			{/if}
		</div>
	</section>

	<aside class="top-0 basis-md overflow-y-auto lg:sticky lg:flex-1">
		<div role="tablist" class="tabs tabs-lift h-full">
			<label class="tab [--tab-border-color:var(--color-base-content)]/20">
				<input type="radio" name="tab" aria-label="Tab Evaluation" role="tab" defaultChecked />
				Evaluation
			</label>

			<div class="tab-content border-base-content/20">
				<EvaluationPanel {taskContext} {evaluation} />
			</div>

			<label class="tab [--tab-border-color:var(--color-base-content)]/20">
				<input type="radio" name="tab" aria-label="Tab Chat" role="tab" />
				Chat
			</label>
			<div class="tab-content border-base-content/20">
				<ChatPanel {taskContext} {evaluation} {messages} />
			</div>
		</div>
	</aside>
</main>
