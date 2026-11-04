import type { TaskCategory } from "#lib/domain/task-category.ts";
import { abortableStream } from "#lib/utils/abortable-stream.ts";
import { env } from "cloudflare:workers";
import { getChatPrompt, getEvaluationPrompt } from "./kv";
import { evaluationSchema } from "#lib/domain/evaluation.ts";
import type { EvaluateRequest } from "#lib/domain/evaluate-request.ts";
import type { DeterministicStats } from "#lib/utils/stats.ts";
import type { ChatRequest } from "#lib/domain/chat-request.ts";

type Configs = {
	id: keyof AiModels;
	seed: number;
	temperature: number;
	enableThinking: boolean;
	maxOutputTokens: number;
};

const CHAT_CONFIGS = {
	id: "@cf/google/gemma-4-26b-a4b-it",
	seed: 42,
	temperature: 0.7,
	enableThinking: false,
	maxOutputTokens: 4500
} as const satisfies Configs;

const EVALUATE_CONFIGS = {
	id: "@cf/google/gemma-4-26b-a4b-it",
	seed: 42,
	temperature: 0.2,
	enableThinking: false,
	maxOutputTokens: 4500
} as const satisfies Configs;

export type ChatWithAiData = ChatRequest & {
	task: { category: "1"; image?: string } | { category: "2" };
	practiceSession: { stats: DeterministicStats };
};

export async function chatWithAi(
	data: ChatWithAiData,
	taskCategory: TaskCategory,
	signal: AbortSignal
): Promise<ReadableStream> {
	const systemPrompt = await getChatPrompt(taskCategory);

	return await abortableStream(
		env.IELTS_WRITING_AI.run(CHAT_CONFIGS.id, {
			messages: [
				{ role: "system", content: systemPrompt },
				// Practice Session Context
				{ role: "user", content: JSON.stringify(data) },
				...(data.task.category === "1"
					? [
							{
								role: "user" as const,
								content: [
									{
										type: "image_url" as const,
										image_url: { url: data.task.image }
									}
								]
							}
						]
					: []),
				// Previous AI evaluation
				...(data.evaluation
					? [{ role: "assistant" as const, content: JSON.stringify(data.evaluation) }]
					: []),
				// Chat messages
				...data.messages.map((c) => ({ role: c.from, content: c.message }))
			],
			seed: CHAT_CONFIGS.seed,
			temperature: CHAT_CONFIGS.temperature,
			max_completion_tokens: CHAT_CONFIGS.maxOutputTokens,
			chat_template_kwargs: { enable_thinking: CHAT_CONFIGS.enableThinking },
			stream: true
		}),
		signal
	);
}

export type EvaluateWithAiData = EvaluateRequest & {
	task: { category: "1"; image: string } | { category: "2" };
	practiceSession: { stats: DeterministicStats };
};

export async function evaluateWithAi(
	data: EvaluateWithAiData,
	taskCategory: TaskCategory,
	signal: AbortSignal
): Promise<ReadableStream> {
	const systemPrompt = await getEvaluationPrompt(taskCategory);

	return await abortableStream(
		env.IELTS_WRITING_AI.run(EVALUATE_CONFIGS.id, {
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: JSON.stringify(data) },
				...(data.task.category === "1"
					? [
							{
								role: "user" as const,
								content: [
									{
										type: "image_url" as const,
										image_url: { url: data.task.image }
									}
								]
							}
						]
					: [])
			],
			seed: EVALUATE_CONFIGS.seed,
			temperature: EVALUATE_CONFIGS.temperature,
			max_completion_tokens: EVALUATE_CONFIGS.maxOutputTokens,
			chat_template_kwargs: { enable_thinking: EVALUATE_CONFIGS.enableThinking },
			response_format: {
				json_schema: {
					name: "ielts-writing-evaluation-schema",
					schema: evaluationSchema.toJSONSchema()
				},
				type: "json_schema"
			},
			stream: true
		}),
		signal
	);
}
