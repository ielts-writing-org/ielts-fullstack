<!--
	Test-only host for ChatPanel tests. It mirrors how the practice page wires
	the panel: `$state` values bound into the panel's `$bindable` props, so
	in-place mutations (push, length) stay reactive.
-->
<script lang="ts">
	import type { ChatMessage } from "#lib/domain/chat-message.ts";
	import type { Evaluation } from "#lib/domain/evaluation.ts";
	import type { PracticeSessionContext } from "#lib/domain/task-context.ts";
	import { untrack } from "svelte";
	import ChatPanel from "./ChatPanel.svelte";

	type Props = {
		practiceSessionId: string;
		practiceSessionContext: PracticeSessionContext;
		evaluation?: Evaluation;
		messages?: ChatMessage[];
		isBusy?: boolean;
		input?: string;
	};

	let {
		practiceSessionId,
		practiceSessionContext,
		evaluation,
		messages: initialMessages = [],
		isBusy: initialIsBusy = false,
		input: initialInput = ""
	}: Props = $props();

	let messages = $state<ChatMessage[]>([...untrack(() => initialMessages)]);
	let isBusy = $state(untrack(() => initialIsBusy));
	let input = $state(untrack(() => initialInput));
</script>

<ChatPanel
	{practiceSessionId}
	{practiceSessionContext}
	{evaluation}
	bind:messages
	bind:isBusy
	bind:input />
