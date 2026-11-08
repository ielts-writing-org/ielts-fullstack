import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { evaluateRequestSchema } from "#lib/domain/evaluate-request.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import { rateLimit } from "#lib/server/rate-limit.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";
import { getAiCompletionAsStream } from "#lib/server/infrastructure/ai.ts";
import { getObjectAsBlob } from "#lib/server/infrastructure/bucket.ts";
import { compressImageAsBase64 } from "#lib/server/infrastructure/images.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { getEvaluationPrompt } from "#lib/server/infrastructure/kv.ts";
import { evaluationSchema } from "#lib/domain/evaluation.ts";

const CONFIGS = {
	model: "@cf/google/gemma-4-26b-a4b-it" as keyof AiModels,
	seed: 42,
	temperature: 0.2,
	maxOutputTokens: 4500,
	enableThinking: false
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = getApiSession(locals);
	await rateLimit(user.id);

	const db = getDatabase();
	const practiceSession = await db.query.practiceSessions.findFirst({
		columns: { response: true },
		where: (practiceSessions, { and, eq }) =>
			and(eq(practiceSessions.id, params.practiceSessionId), eq(practiceSessions.userId, user.id)),
		with: {
			task: {
				columns: {
					category: true,
					prompt: true,
					imageName: true
				}
			},
			evaluation: {
				columns: { result: true }
			},
			chatMessages: {
				columns: { from: true, message: true }
			}
		}
	});

	if (!practiceSession) {
		error(404);
	}

	const result = evaluateRequestSchema.safeParse({
		task: {
			category: practiceSession.task.category,
			imageName: practiceSession.task.imageName,
			prompt: practiceSession.task.prompt
		},
		practiceSession: { response: practiceSession.response }
	});

	if (!result.success || !result.data) {
		error(400);
	}

	let imageBase64: string | undefined;
	if (practiceSession.task.category === "1" && practiceSession.task.imageName) {
		const image = await getObjectAsBlob(practiceSession.task.imageName);
		if (image) {
			imageBase64 = await compressImageAsBase64(image);
		}
	}

	const systemPrompt = await getEvaluationPrompt(practiceSession.task.category);

	const stream = await getAiCompletionAsStream(
		CONFIGS.model,
		[
			{ role: "system", content: systemPrompt },
			{
				role: "user",
				content: JSON.stringify({
					task: {
						category: practiceSession.task.category,
						prompt: practiceSession.task.prompt
					},
					practiceSession: {
						response: practiceSession.response,
						stats: computeDeterministicStats(practiceSession.response)
					}
				})
			},
			...(practiceSession.task.category === "1"
				? [
						{
							role: "user" as const,
							content: [
								{
									type: "image_url" as const,
									image_url: { url: imageBase64 }
								}
							]
						}
					]
				: [])
		],
		request.signal,
		{
			seed: CONFIGS.seed,
			thinking: CONFIGS.enableThinking,
			temperature: CONFIGS.temperature,
			maxCompletionToken: CONFIGS.maxOutputTokens,
			responseSchema: evaluationSchema.toJSONSchema()
		}
	);

	return new Response(stream, {
		headers: { "cache-control": "no-cache", "content-type": "text/event-stream" }
	});
};
