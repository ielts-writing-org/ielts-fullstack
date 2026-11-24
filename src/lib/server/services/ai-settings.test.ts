import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AI_RUNTIME } from "#lib/domain/ai-config.ts";
import { getStoredAiSettings } from "#lib/server/data/ai-settings.ts";
import { getAiRuntimeConfig, getChatPrompt, getEvaluationPrompt } from "./ai-settings.ts";

vi.mock("#lib/server/data/ai-settings.ts", () => ({
	getStoredAiSettings: vi.fn(async () => new Map<string, string>())
}));

const getStoredAiSettingsMock = vi.mocked(getStoredAiSettings);

/** Points the settings lookup at the given stored key/value pairs. */
function storedSettings(entries: Record<string, string>) {
	getStoredAiSettingsMock.mockImplementation(async (keys: readonly string[]) => {
		return new Map(Object.entries(entries).filter(([key]) => keys.includes(key)));
	});
}

beforeEach(() => {
	getStoredAiSettingsMock.mockReset();
	getStoredAiSettingsMock.mockImplementation(async () => new Map<string, string>());
});

/**
 * Admin-configured AI settings come from D1 as raw strings; they must never
 * reach the AI provider unvalidated, since a bad model name or an out-of-range
 * temperature would break every chat and grading request.
 */
describe("getAiRuntimeConfig()", () => {
	it("returns the given defaults when nothing is stored", async () => {
		const defaults = { ...DEFAULT_AI_RUNTIME, seed: 2026, temperature: 0.7 };

		const config = await getAiRuntimeConfig(defaults);

		expect(config).toEqual(defaults);
	});

	it("returns the built-in defaults when no defaults are supplied", async () => {
		const config = await getAiRuntimeConfig();

		expect(config).toEqual(DEFAULT_AI_RUNTIME);
	});

	it("keeps stored values that are valid", async () => {
		storedSettings({
			chatModel: "@cf/meta/llama-4-scout-17b-16e-instruct",
			gradingModel: "@cf/google/gemma-4-26b-a4b-it",
			enableThinking: "true",
			maxOutputTokens: "2048",
			seed: "7",
			temperature: "0.9",
			chatDailyLimit: "20",
			gradingDailyLimit: "10"
		});

		const config = await getAiRuntimeConfig();

		expect(config).toEqual({
			chatModel: "@cf/meta/llama-4-scout-17b-16e-instruct",
			gradingModel: "@cf/google/gemma-4-26b-a4b-it",
			enableThinking: true,
			maxOutputTokens: 2048,
			seed: 7,
			temperature: 0.9,
			chatDailyLimit: 20,
			gradingDailyLimit: 10
		});
	});

	it("replaces invalid stored values with the defaults", async () => {
		storedSettings({
			chatModel: "gpt-4o",
			gradingModel: "claude-3",
			enableThinking: "maybe",
			maxOutputTokens: "64",
			seed: "3.5",
			temperature: "5",
			chatDailyLimit: "-3",
			gradingDailyLimit: "600"
		});

		const config = await getAiRuntimeConfig();

		expect(config).toEqual(DEFAULT_AI_RUNTIME);
	});

	it("accepts values sitting exactly on the configured bounds", async () => {
		storedSettings({
			maxOutputTokens: "128",
			seed: "2147483647",
			temperature: "2",
			chatDailyLimit: "0",
			gradingDailyLimit: "500"
		});

		const config = await getAiRuntimeConfig();

		expect(config).toEqual({
			...DEFAULT_AI_RUNTIME,
			maxOutputTokens: 128,
			seed: 2147483647,
			temperature: 2,
			chatDailyLimit: 0,
			gradingDailyLimit: 500
		});
	});
});

describe("getChatPrompt() and getEvaluationPrompt()", () => {
	it("reads the stored prompt for the task category, trimmed", async () => {
		storedSettings({ "chat-prompt-1": "  You are an IELTS writing tutor.  " });

		await expect(getChatPrompt("1")).resolves.toBe("You are an IELTS writing tutor.");
	});

	it("throws when the prompt has not been configured", async () => {
		await expect(getChatPrompt("2")).rejects.toThrow(
			"Config value not found for key: chat-prompt-2"
		);
	});

	it("throws when the prompt is blank", async () => {
		storedSettings({ "evaluation-prompt-1": "   " });

		await expect(getEvaluationPrompt("1")).rejects.toThrow(
			"Config value not found for key: evaluation-prompt-1"
		);
	});
});
