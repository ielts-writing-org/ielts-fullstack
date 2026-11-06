<script lang="ts">
	import { untrack } from "svelte";
	import type { ChatMessage } from "#lib/domain/chat-message.ts";
	import type { Evaluation } from "#lib/domain/evaluation.ts";
	import type { PracticeSessionContext } from "#lib/domain/task-context.ts";
	import { ListCheck, MessagesSquare } from "@lucide/svelte";
	import ChatPanel from "./ChatPanel.svelte";
	import EvaluationPanel from "./EvaluationPanel.svelte";

	type Props = {
		practiceSessionId: string;
		practiceSessionContext: PracticeSessionContext;
		evaluation?: Evaluation;
		messages?: ChatMessage[];
		isChatBusy?: boolean;
		isEvaluationBusy?: boolean;
	};

	let {
		practiceSessionId,
		practiceSessionContext,
		evaluation: initialEvaluation,
		messages: initialMessages,
		isChatBusy = $bindable(false),
		isEvaluationBusy = $bindable(false)
	}: Props = $props();

	let evaluation = $state<Evaluation | undefined>(untrack(() => initialEvaluation));
	let messages = $state<ChatMessage[]>(untrack(() => initialMessages ?? []));
	let chatDraft = $state("");

	// Open the panel the learner most likely needs: the evaluation if one
	// exists, otherwise the tutor chat if they have already been asking.
	let activeTab = $state<"chat" | "evaluate">(
		untrack(() => (!initialEvaluation && (initialMessages?.length ?? 0) > 0 ? "chat" : "evaluate"))
	);

	const estimatedBand = $derived(evaluation?.estimatedBand);

	/** Switches to the tutor chat with a prefilled question (evaluation bridge). */
	function askTutor(question: string) {
		chatDraft = question;
		activeTab = "chat";
	}
</script>

<div class="tabs tabs-lift h-full" role="tablist">
	<label class="tab [--tab-border-color:var(--color-base-content)]/20">
		<input
			type="radio"
			name="tab"
			aria-label="Tab Chat"
			role="tab"
			checked={activeTab === "chat"}
			onchange={() => (activeTab = "chat")} />
		<MessagesSquare class="me-2 size-4" />
		Chat
		{#if messages.length > 0}
			<span class="ms-1 badge badge-soft badge-xs font-semibold badge-primary">
				{messages.length}
			</span>
		{/if}
	</label>
	<div class="tab-content border-base-content/20">
		<ChatPanel
			{practiceSessionId}
			{practiceSessionContext}
			{evaluation}
			bind:messages
			bind:isBusy={isChatBusy}
			bind:input={chatDraft} />
	</div>

	<label class="tab [--tab-border-color:var(--color-base-content)]/20">
		<input
			type="radio"
			name="tab"
			aria-label="Tab Evaluation"
			role="tab"
			checked={activeTab === "evaluate"}
			onchange={() => (activeTab = "evaluate")} />
		<ListCheck class="me-2 size-4" />
		Evaluation
		{#if estimatedBand}
			<span
				class={[
					"ms-1 badge badge-xs font-semibold",
					estimatedBand >= 7.5 && "badge-success",
					estimatedBand >= 5.5 && estimatedBand < 7.5 && "badge-warning",
					estimatedBand < 5.5 && "badge-error"
				]}>
				{estimatedBand.toFixed(1)}
			</span>
		{/if}
	</label>
	<div class="tab-content border-base-content/20">
		<EvaluationPanel
			{practiceSessionId}
			{practiceSessionContext}
			bind:evaluation
			bind:isBusy={isEvaluationBusy}
			onAskTutor={askTutor} />
	</div>
</div>
