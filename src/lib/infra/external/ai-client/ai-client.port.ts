import type { AI_CONFIGS } from "./config";

export type AiClientMessages = AiModels[typeof AI_CONFIGS.id]["inputs"]["messages"];

export interface AiClient {
	chat(
		messages: AiClientMessages,
		promptId: "1" | "2",
		signal: AbortSignal
	): Promise<ReadableStream>;
	evaluate(
		messages: AiClientMessages,
		promptId: "1" | "2",
		signal: AbortSignal
	): Promise<ReadableStream>;
}
