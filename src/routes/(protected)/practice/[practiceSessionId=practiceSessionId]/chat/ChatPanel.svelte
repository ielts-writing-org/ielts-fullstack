<script lang="ts">
	import { openModal } from "#lib/components/Modal.svelte";
	import type { ChatMessage } from "#lib/schemas/chat-message.ts";
	import { chatRequestSchema } from "#lib/schemas/chat-request.ts";
	import type { Evaluation } from "#lib/schemas/evaluation.ts";
	import type { PracticeSessionContext } from "#lib/schemas/task-context.ts";
	import { getFirstZodError } from "#lib/utils/error.ts";
	import { page } from "$app/state";
	import { MessagesSquare, Send } from "@lucide/svelte";
	import { type EventSourceMessage, EventSourceParserStream } from "eventsource-parser/stream";
	import { marked } from "marked";
	import { ZodError } from "zod";
	import sanitize from "sanitize-html";
	import { buildChatRequestFormData } from "./utils";
	import { saveChatMessage } from "./save-chat-message.remote";

	type Props = {
		practiceSessionId: string;
		evaluation: Evaluation | undefined;
		messages: ChatMessage[];
		practiceSessionContext: PracticeSessionContext;
		isBusy: boolean;
	};

	let { messages = $bindable([]), isBusy = $bindable(false), ...props }: Props = $props();

	let chatInput = $state<string>("");
	let abortController = $state<AbortController>(new AbortController());

	async function handleChat() {
		try {
			if (isBusy) {
				abortController?.abort();
				abortController = new AbortController();
				return;
			}

			const message = chatInput.trim();
			if (!message) {
				return;
			}

			isBusy = true;

			const vRequest = chatRequestSchema.parse({
				taskContext: props.practiceSessionContext,
				evaluation: props.evaluation,
				messages: [...messages, { from: "user" as const, message }]
			});

			const form = buildChatRequestFormData(vRequest);

			const response = await fetch(`${page.url.pathname}/chat`, {
				body: form,
				credentials: "include",
				method: "POST",
				signal: abortController.signal
			});

			if (!response.ok) {
				throw new Error("There was a problem while contacting the server");
			}

			const stream = response.body;
			if (!stream) {
				throw new Error("Cannot read response body");
			}

			messages.push({ from: "user", message: message });
			chatInput = "";

			messages[messages.length] = {
				from: "assistant",
				message: ""
			};

			const reader = stream
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(new EventSourceParserStream())
				.pipeThrough(
					new TransformStream<EventSourceMessage>({
						transform(chunk, controller) {
							if (chunk.data === "[DONE]") return;

							try {
								const json = JSON.parse(chunk.data);
								// TODO: Make this into openapi-compatible structured json
								const content = json.choices?.[0]?.delta?.content;
								if (content) {
									controller.enqueue(content);
								}
							} catch {
								// Ignore non-JSON control signals or ping events
							}
						}
					})
				)
				.getReader();
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					Promise.all([
						saveChatMessage({
							practiceSessionId: props.practiceSessionId,
							chatMessage: messages[messages.length - 2]
						}),
						saveChatMessage({
							practiceSessionId: props.practiceSessionId,
							chatMessage: messages[messages.length - 1]
						})
					]);
					break;
				}
				messages[messages.length - 1].message += value;
			}
		} catch (e) {
			if (e instanceof ZodError) {
				const error = getFirstZodError(e);
				openModal({ content: error.message, primaryButton: "Close", title: error.title });
			} else {
				openModal({
					content: String(e),
					primaryButton: "Close",
					title: "Unable to chat"
				});
			}
		} finally {
			isBusy = false;
		}
	}
</script>

<div class={["h-full w-full rounded-box", isBusy && "aura aura-holo"]}>
	<div class="flex h-full w-full flex-col gap-2 rounded-box bg-base-100 p-3">
		<div
			class="prose prose-sm flex max-w-none flex-1 flex-col gap-2 overflow-y-auto prose-p:my-0 prose-p:py-0">
			{#if messages.length === 0}
				<div class="flex flex-1 flex-col items-center justify-center gap-2 text-base-content/75">
					<MessagesSquare size="2em" />
					No chats yet.
				</div>
			{:else}
				{#each messages as chat, i (i)}
					<div
						class={[
							"chat",
							chat.from === "assistant" && "chat-start",
							chat.from === "user" && "chat-end"
						]}>
						<div class="chat-header">{chat.from === "user" ? "You" : "AI Tutor"}</div>
						<div
							class={[
								"chat-bubble wrap-break-word",
								chat.from === "user" && "chat-bubble-primary"
							]}>
							{@html sanitize(marked.parse(chat.message, { async: false }))}
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<form class="join" onsubmit={(e) => e.preventDefault()}>
			<label class="input join-item flex-1">
				<input
					type="text"
					placeholder="Ask a question..."
					required={!isBusy}
					disabled={isBusy}
					bind:value={chatInput} />
			</label>
			<button class="btn join-item btn-primary" disabled={isBusy} onclick={handleChat}>
				<span class="loading loading-sm loading-dots" hidden={!isBusy}></span>
				<span class="hidden sm:inline" hidden={isBusy}>Send</span>
				<Send class={[isBusy && "hidden"]} size="1em" />
			</button>
		</form>
	</div>
</div>
