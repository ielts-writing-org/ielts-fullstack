<script lang="ts">
	import { openModal } from "#lib/components/modal/Modal.svelte";
	import type { ChatMessage } from "#lib/schemas/chat-message.ts";
	import { chatRequestSchema } from "#lib/schemas/chat-request.ts";
	import type { Evaluation } from "#lib/schemas/evaluation.ts";
	import type { TaskContext } from "#lib/schemas/task-context.ts";
	import { getFirstZodError } from "#lib/utils/error.ts";
	import { page } from "$app/state";
	import { MessagesSquare, Send } from "@lucide/svelte";
	import { EventSourceParserStream, type EventSourceMessage } from "eventsource-parser/stream";
	import { marked } from "marked";
	import { ZodError } from "zod";
	import { buildChatRequestFormData } from "./utils";

	type Props = {
		taskContext: TaskContext;
		evaluation?: Evaluation;
		messages: ChatMessage[];
	};

	let { taskContext, evaluation, messages = $bindable([]) }: Props = $props();

	let chatInput = $state<string>("");
	let aiResponse = $state<string>("");
	let isExecuting = $state<boolean>(false);
	let abortController = $state<AbortController>(new AbortController());

	async function handleChat() {
		try {
			if (isExecuting) {
				abortController?.abort();
				abortController = new AbortController();
				return;
			}

			const message = chatInput.trim();
			if (!message) {
				return;
			}

			isExecuting = true;

			const vRequest = chatRequestSchema.parse({
				taskContext,
				evaluation,
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
			aiResponse = "";

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
					break;
				}
				aiResponse += value;
			}

			if (response) {
				messages.push({ from: "assistant", message: aiResponse });
			}
		} catch (e) {
			if (e instanceof ZodError) {
				const error = getFirstZodError(e);
				openModal({ title: error.title, content: error.message, primaryButton: { text: "Close" } });
			} else {
				openModal({
					title: "Unable to chat",
					content: String(e),
					primaryButton: { text: "Close" }
				});
			}
		} finally {
			isExecuting = false;
		}
	}
</script>

<div class={["h-full w-full rounded-box", isExecuting && "aura aura-holo"]}>
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
								{ "chat-bubble-primary": chat.from === "user" }
							]}>
							{@html marked.parse(chat.message)}
						</div>
					</div>
				{/each}
			{/if}
			{#if isExecuting && aiResponse}
				<div class="chat-start chat">
					<div class="chat-header">AI Tutor</div>
					<div class="chat-bubble wrap-break-word">{@html marked.parse(aiResponse)}</div>
				</div>
			{/if}
		</div>

		<form class="join" onsubmit={(e) => e.preventDefault()}>
			<label class="input join-item flex-1">
				<input
					type="text"
					placeholder="Ask a question..."
					required={!isExecuting}
					disabled={isExecuting}
					bind:value={chatInput} />
			</label>
			<button class="btn join-item btn-primary" disabled={isExecuting} onclick={handleChat}>
				<span class="loading loading-sm loading-dots" hidden={!isExecuting}></span>
				<span class="hidden sm:inline" hidden={isExecuting}>Send</span>
				<Send class={[isExecuting && "hidden"]} size="1em" />
			</button>
		</form>
	</div>
</div>
