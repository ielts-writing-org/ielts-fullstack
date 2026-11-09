import { userEvent } from "vitest/browser";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import ChatTestHost from "./ChatTestHost.svelte";
import Modal, { closeModal } from "#lib/components/Modal.svelte";
import { saveChatMessages } from "#lib/remotes/command/save-chat-message.remote.ts";
import { clearChatMessages } from "#lib/remotes/command/clear-chat-messages.remote.ts";
import type { ChatMessage } from "#lib/domain/chat-message.ts";
import { createMockString } from "#lib/utils/test.ts";

vi.mock("$app/state", () => ({
	page: { url: new URL("http://localhost:5173/practice/session-1") }
}));

vi.mock("#lib/remotes/command/save-chat-message.remote.ts", () => ({
	saveChatMessages: vi.fn(async () => {})
}));

vi.mock("#lib/remotes/command/clear-chat-messages.remote.ts", () => ({
	clearChatMessages: vi.fn(async () => {})
}));

/**
 * Chat panel contract with the AI tutor: learner input -> POST `<page>/chat`
 * -> SSE stream -> assistant bubble filled progressively -> conversation
 * persisted. Validation runs client-side before any network call.
 */
function sseResponse(chunks: string[]): Response {
	const encoder = new TextEncoder();
	const frames = chunks.map(
		(content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
	);
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const frame of frames) {
				controller.enqueue(encoder.encode(frame));
			}
			controller.enqueue(encoder.encode("data: [DONE]\n\n"));
			controller.close();
		}
	});
	return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

let cleanups: Array<() => void> = [];

async function mountChat(messages: ChatMessage[] = [], isBusy = false) {
	const modal = await render(Modal);
	cleanups.push(modal.unmount);

	const chat = await render(ChatTestHost, {
		practiceSessionId: "session-1",
		practiceSessionContext: {
			category: "2",
			prompt: "Prompt.",
			response: "Response.",
			imageName: undefined
		},
		evaluation: undefined,
		messages,
		isBusy,
		input: ""
	});
	cleanups.push(chat.unmount);
	return chat;
}

function textInput(container: HTMLElement): HTMLInputElement {
	return container.querySelector<HTMLInputElement>('input[placeholder="Ask a question..."]')!;
}

function sendButton(container: HTMLElement): HTMLButtonElement {
	const button = Array.from(container.querySelectorAll("button")).find((b) =>
		b.textContent?.includes("Send")
	)!;
	return button;
}

afterEach(async () => {
	while (document.querySelector<HTMLDialogElement>("dialog.modal")?.open) {
		await closeModal();
	}
	for (const unmount of cleanups) {
		unmount();
	}
	cleanups = [];
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe("ChatPanel", () => {
	test("shows the empty state with tutor suggestions and no clear button", async () => {
		const { container } = await mountChat();

		expect(container.textContent).toContain("Ask the AI tutor anything");
		expect(container.textContent).toContain("Give me ideas for this task");
		expect(container.textContent).toContain("Is my essay well structured?");
		expect(container.textContent).toContain("How can I improve my vocabulary?");
		expect(container.textContent).toContain("Check my introduction");
		expect(container.querySelector('[aria-label="Clear conversation"]')).toBeNull();
		expect(container.querySelectorAll(".chat").length).toBe(0);
	});

	test("sends the message and streams the assistant reply, then persists the conversation", async () => {
		const fetchMock = vi.fn(async () => sseResponse(["Hello, ", "how can I help?"]));
		vi.stubGlobal("fetch", fetchMock);

		const { container } = await mountChat();
		await userEvent.fill(textInput(container), "How do I write an overview?");
		await userEvent.click(sendButton(container));

		await vi.waitFor(() => expect(saveChatMessages).toHaveBeenCalledTimes(1), { timeout: 5000 });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("/practice/session-1/chat");
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual({
			from: "user",
			message: "How do I write an overview?"
		});

		const bubbles = container.querySelectorAll(".chat");
		expect(bubbles.length).toBe(2);
		expect(bubbles[0].querySelector(".chat-header")!.textContent).toContain("You");
		expect(bubbles[1].querySelector(".chat-header")!.textContent).toContain("AI Tutor");
		expect(bubbles[1].textContent).toContain("Hello, how can I help?");

		expect(saveChatMessages).toHaveBeenCalledWith({
			practiceSessionId: "session-1",
			chatMessages: [
				{ from: "user", message: "How do I write an overview?" },
				{ from: "assistant", message: "Hello, how can I help?" }
			]
		});

		expect(textInput(container).value).toBe("");
	});

	test("a suggestion button sends its text as the user message", async () => {
		const fetchMock = vi.fn(async () => sseResponse(["Sure, here are some ideas."]));
		vi.stubGlobal("fetch", fetchMock);

		const { container } = await mountChat();
		const suggestion = Array.from(container.querySelectorAll("button")).find((b) =>
			b.textContent?.includes("Give me ideas for this task")
		)!;
		await userEvent.click(suggestion);

		await vi.waitFor(() => expect(saveChatMessages).toHaveBeenCalledTimes(1), { timeout: 5000 });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(JSON.parse(init.body as string)).toEqual({
			from: "user",
			message: "Give me ideas for this task"
		});
		expect(container.textContent).toContain("Sure, here are some ideas.");
	});

	test("blocks messages over 100 words with a validation error before any request", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const { container } = await mountChat();
		const longMessage = createMockString(101);
		await userEvent.fill(textInput(container), longMessage);
		await userEvent.click(sendButton(container));

		await vi.waitFor(() => expect(document.body.textContent).toContain("Validation Error"), {
			timeout: 5000
		});
		expect(document.body.textContent).toContain("Chat message must be between 1 and 100 words");
		expect(fetchMock).not.toHaveBeenCalled();

		// The drafted message survives so the learner can shorten it.
		expect(textInput(container).value).toBe(longMessage);
	});

	test("ignores empty input without opening a request", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const { container } = await mountChat();
		await userEvent.click(sendButton(container));

		expect(fetchMock).not.toHaveBeenCalled();
		expect(container.querySelectorAll(".chat").length).toBe(0);
	});

	test("renders an existing conversation and clears it after confirmation", async () => {
		const { container } = await mountChat([
			{ from: "user", message: "How can I improve?" },
			{ from: "assistant", message: "Focus on linking words." }
		]);

		expect(container.querySelectorAll(".chat").length).toBe(2);
		expect(container.textContent).toContain("How can I improve?");
		expect(container.textContent).toContain("Focus on linking words.");

		await userEvent.click(
			container.querySelector<HTMLButtonElement>('[aria-label="Clear conversation"]')!
		);

		await vi.waitFor(() => expect(document.body.textContent).toContain("Clear all messages"), {
			timeout: 5000
		});
		const clearButton = Array.from(document.querySelectorAll("button")).find(
			(b) => b.textContent?.trim() === "Clear"
		)!;
		await userEvent.click(clearButton);

		await vi.waitFor(() => expect(clearChatMessages).toHaveBeenCalledTimes(1), { timeout: 5000 });
		expect(clearChatMessages).toHaveBeenCalledWith({ practiceSessionId: "session-1" });

		// The list empties immediately and the empty state returns.
		await vi.waitFor(() => expect(container.textContent).toContain("Ask the AI tutor anything"), {
			timeout: 5000
		});
		expect(container.querySelectorAll(".chat").length).toBe(0);
	});
});
