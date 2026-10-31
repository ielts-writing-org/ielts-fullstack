<script lang="ts">
	import type { ChatMessage } from "#lib/schemas/chat-message.ts";
	import type { Evaluation } from "#lib/schemas/evaluation.ts";
	import type { PracticeSessionContext } from "#lib/schemas/task-context.ts";
	import { ListCheck, MessagesSquare } from "@lucide/svelte";
	import ChatPanel from "./chat/ChatPanel.svelte";
	import EvaluationPanel from "./evaluate/EvaluationPanel.svelte";

	type Props = {
		practiceSessionId: string;
		practiceSessionContext: PracticeSessionContext;
		evaluation: Evaluation | undefined;
		messages: ChatMessage[];
		isChatBusy: boolean;
		isEvaluationBusy: boolean;
	};

	let {
		evaluation = $bindable(),
		messages = $bindable(),
		isChatBusy = $bindable(),
		isEvaluationBusy = $bindable(),
		...props
	}: Props = $props();

	const estimatedBand = $derived(evaluation?.estimatedBand);
	// Open the panel the learner most likely needs: the evaluation if one
	// exists, otherwise the tutor chat if they have already been asking.
	let activeTab = $state<"chat" | "evaluate">(!evaluation && messages.length > 0 ? "chat" : "evaluate");
	let chatDraft = $state("");

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
			practiceSessionId={props.practiceSessionId}
			practiceSessionContext={props.practiceSessionContext}
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
			practiceSessionId={props.practiceSessionId}
			practiceSessionContext={props.practiceSessionContext}
			bind:evaluation
			bind:isBusy={isEvaluationBusy}
			onAskTutor={askTutor} />
	</div>
</div>
