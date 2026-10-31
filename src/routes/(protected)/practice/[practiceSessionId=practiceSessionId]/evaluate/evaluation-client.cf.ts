import type { EvaluateRequestWithStats, EvaluationClient } from "./evaluation-client.port";
import type { ConfigProvider } from "#lib/server/infrastructure/config-provider/config-provider.port.ts";
import type { TaskCategory } from "#lib/schemas/task-category.ts";
import { abortableStream } from "#lib/utils/abortable-stream.ts";
import { AI_CONFIGS } from "./config";
import { evaluationSchema } from "#lib/schemas/evaluation.ts";

export class CfEvaluationClient implements EvaluationClient {
	constructor(
		private readonly configProvider: ConfigProvider,
		private readonly ai: Ai
	) {}

	async execute(
		taskCategory: TaskCategory,
		request: EvaluateRequestWithStats,
		signal: AbortSignal
	): Promise<ReadableStream> {
		const systemPrompt = await this.configProvider.getEvaluationPrompt(taskCategory);

		return await abortableStream(
			this.ai.run(AI_CONFIGS.id, {
				seed: AI_CONFIGS.seed,
				temperature: AI_CONFIGS.temperature,
				max_completion_tokens: AI_CONFIGS.maxOutputTokens,
				messages: [
					{ role: "system" as const, content: systemPrompt },
					{
						role: "user" as const,
						content: [
							{ type: "text", text: JSON.stringify(request) },
							...(request.task.category === "1" && request.task.image
								? [
										{
											type: "image_url" as const,
											image_url: { url: request.task.image }
										}
									]
								: [])
						]
					}
				],
				response_format: {
					json_schema: {
						name: "ielts-writing-evaluation-schema",
						schema: evaluationSchema.toJSONSchema()
					},
					type: "json_schema"
				},
				chat_template_kwargs: { enable_thinking: AI_CONFIGS.enableThinking },
				stream: true
			}),
			signal
		);
	}
}
