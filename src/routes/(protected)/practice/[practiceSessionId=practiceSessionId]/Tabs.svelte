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

	const props: Props = $props();
</script>

<div class="tabs tabs-lift h-full" role="tablist">
	<label class="tab [--tab-border-color:var(--color-base-content)]/20">
		<input type="radio" name="tab" aria-label="Tab Chat" role="tab" />
		<MessagesSquare class="me-2 size-4" />
		Chat
	</label>
	<div class="tab-content border-base-content/20">
		<ChatPanel
			practiceSessionId={props.practiceSessionId}
			practiceSessionContext={props.practiceSessionContext}
			evaluation={props.evaluation}
			messages={props.messages}
			isBusy={props.isChatBusy} />
	</div>

	<label class="tab [--tab-border-color:var(--color-base-content)]/20">
		<input type="radio" name="tab" aria-label="Tab Evaluation" role="tab" defaultChecked />
		<ListCheck class="me-2 size-4" />
		Evaluation
	</label>
	<div class="tab-content border-base-content/20">
		<EvaluationPanel
			practiceSessionId={props.practiceSessionId}
			practiceSessionContext={props.practiceSessionContext}
			evaluation={props.evaluation}
			isBusy={props.isEvaluationBusy} />
	</div>
</div>
