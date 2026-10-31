<script lang="ts">
	import { page } from "$app/state";
	import { type EventSourceMessage, EventSourceParserStream } from "eventsource-parser/stream";
	import sanitize from "sanitize-html";
	import { marked } from "marked";
	import { MessagesSquare, Send, Trash } from "@lucide/svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import type { ChatMessage } from "#lib/schemas/chat-message.ts";
	import { chatRequestSchema } from "#lib/schemas/chat-request.ts";
	import type { Evaluation } from "#lib/schemas/evaluation.ts";
	import type { PracticeSessionContext } from "#lib/schemas/task-context.ts";
	import { getZodErrors, type SerializedZodError } from "#lib/utils/error.ts";
	import { saveChatMessages } from "./save-chat-message.remote";
	import { clearChatMessages } from "./clear-chat-messages.remote";

	type Props = {
		practiceSessionId: string;
		practiceSessionContext: PracticeSessionContext;
		evaluation: Evaluation | undefined;
		messages: ChatMessage[];
		isBusy: boolean;
		/** Current draft of the chat input box, bindable so other panels can prefill it. */
		input?: string;
	};

	let {
		messages = $bindable(),
		isBusy = $bindable(),
		input = $bindable(""),
		...props
	}: Props = $props();
	let abortController = $state<AbortController>(new AbortController());

	const CHAT_SUGGESTIONS = [
		"Give me ideas for this task",
		"Is my essay well structured?",
		"How can I improve my vocabulary?",
		"Check my introduction"
	];

	async function sendSuggestion(suggestion: string) {
		input = suggestion;
		await handleChat();
	}

	function handleClearChat() {
		openModal({
			title: { text: "Clear all messages", color: "error" },
			content: "This removes the entire conversation with the AI tutor. This cannot be undone.",
			primaryButton: {
				text: "Clear",
				color: "error",
				style: "ghost",
				onclick: async () => {
					await clearChatMessages({ practiceSessionId: props.practiceSessionId });
					messages.length = 0;
				}
			},
			secondaryButton: {
				text: "Cancel",
				color: "primary"
			}
		});
	}

	async function handleChat() {
		try {
			if (isBusy) {
				abortController?.abort();
				abortController = new AbortController();
				return;
			}

			const message = input.trim();
			if (!message) {
				return;
			}

			isBusy = true;

			const result = chatRequestSchema.safeParse({
				task: {
					category: props.practiceSessionContext.category,
					prompt: props.practiceSessionContext.prompt,
					imageName: props.practiceSessionContext.imageName
				},
				practiceSession: {
					response: props.practiceSessionContext.response
				},
				messages: [...messages, { from: "user" as const, message }],
				evaluation: props.evaluation
			});

			if (!result.success) {
				const errors = getZodErrors(result.error);
				return openModal({
					title: "Validation Error",
					content: {
						snippet: validationErrorSnippet,
						args: { errors: errors }
					},
					primaryButton: "Close"
				});
			}

			const response = await fetch(`${page.url.pathname}/chat`, {
				body: JSON.stringify(result.data),
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				method: "POST",
				signal: abortController.signal
			});

			if (!response.ok) {
				const { zodErrors } = await response.json<{ zodErrors: SerializedZodError[] }>();
				return openModal({
					title: "Unable to chat",
					content: {
						snippet: validationErrorSnippet,
						args: { errors: zodErrors }
					},
					primaryButton: "Close"
				});
			}

			const stream = response.body;
			if (!stream) {
				return openModal({
					title: "Unable to chat",
					content: "Cannot read response body",
					primaryButton: "Close"
				});
			}

			messages.push({ from: "user", message: message }, { from: "assistant", message: "" });
			input = "";

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
					await saveChatMessages({
						practiceSessionId: props.practiceSessionId,
						chatMessages: [messages[messages.length - 2], messages[messages.length - 1]]
					});
					break;
				}
				messages[messages.length - 1].message += value;
			}
		} catch (e) {
			openModal({
				title: "Unable to chat",
				content: String(e),
				primaryButton: "Close"
			});
		} finally {
			isBusy = false;
		}
	}
</script>

{#snippet validationErrorSnippet(args: { errors: SerializedZodError[] })}
	<ol class="list-inside list-decimal">
		{#each args.errors as error, i (i)}
			<li>
				<span class="font-semibold">{error.field}:</span>
				{error.message}
			</li>
		{/each}
	</ol>
{/snippet}

<div class={["h-full w-full rounded-box", isBusy && "aura aura-holo"]}>
	<div class="flex h-full w-full flex-col rounded-box bg-base-100 p-3">
		<div class="flex items-center justify-between gap-2 border-b border-b-base-content/20 pb-2">
			<div>
				<span class="flex items-center gap-1.5 text-sm font-semibold">
					<MessagesSquare class="size-4" />
					AI Tutor
				</span>
				<span class="block text-xs text-base-content/75">
					AI can make mistakes so double-check responses.
				</span>
			</div>

			{#if messages.length > 0}
				<button
					class="btn btn-ghost text-error btn-xs"
					title="Clear conversation"
					aria-label="Clear conversation"
					disabled={isBusy || clearChatMessages.pending > 0}
					onclick={handleClearChat}>
					<Trash class="size-4" />
					Clear all messages
				</button>
			{/if}
		</div>

		<div
			class="relative prose prose-sm flex max-w-none flex-1 flex-col gap-2 overflow-y-auto prose-p:my-0 prose-p:py-0">
			{#if messages.length === 0}
				<div class="flex flex-1 flex-col items-center justify-center gap-3 text-base-content/75">
					<MessagesSquare size="2em" />
					<div class="text-center">
						<p class="font-semibold text-base-content">Ask the AI tutor anything</p>
						<p class="text-xs">Get ideas, structure help, or feedback on your draft.</p>
					</div>
					<div class="flex max-w-md flex-wrap justify-center gap-1.5">
						{#each CHAT_SUGGESTIONS as suggestion (suggestion)}
							<button
								type="button"
								class="btn btn-dash btn-primary btn-xs"
								disabled={isBusy}
								onclick={() => sendSuggestion(suggestion)}>
								{suggestion}
							</button>
						{/each}
					</div>
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
						<!-- Message content is sanitized with sanitize-html before rendering. -->
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
					bind:value={input} />
			</label>
			<button class="btn join-item btn-primary" disabled={isBusy} onclick={handleChat}>
				<span class="loading loading-sm loading-dots" hidden={!isBusy}></span>
				<span class="hidden sm:inline" hidden={isBusy}>Send</span>
				<Send class={["size-4", isBusy && "hidden"]} />
			</button>
		</form>
	</div>
</div>
