import { describe, expect, it } from "vitest";
import { chatMessageSchema, getChatMessageAcceptableWordCount } from "./chat-message.ts";
import { createMockString } from "#lib/utils/test.ts";

describe.concurrent("chatMessageSchema", () => {
	const [min, max] = getChatMessageAcceptableWordCount();
	it.concurrent.each([
		["accepts", min, true],
		["accepts", max, true],
		["accepts", min + 18, true],
		["rejects", 0, false],
		["rejects", max + 20, false]
	])("%s user message with %i word(s)", (_, length, expected) => {
		const message = createMockString(length);
		const result = chatMessageSchema.safeParse({ from: "user", message });
		expect(result.success).toBe(expected);
	});

	it("rejects non-string messages", () => {
		expect(chatMessageSchema.safeParse({ from: "user", message: 42 }).success).toBe(false);
	});

	it.concurrent.each([
		["accepts", 0, true],
		["accepts", 18, true],
		["accepts", 500, true]
	])("%s assistant message with %i word(s)", (_, length, expected) => {
		const message = createMockString(length);
		const result = chatMessageSchema.safeParse({ from: "assistant", message });
		expect(result.success).toBe(expected);
	});

	it.concurrent.each([["system"], [undefined]])("rejects message from %s", (author) => {
		const result = chatMessageSchema.safeParse({ from: author, message: "hi" });
		expect(result.success).toBe(false);
	});
});
