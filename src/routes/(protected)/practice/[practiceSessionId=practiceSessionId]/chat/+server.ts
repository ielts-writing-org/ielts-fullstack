import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { getApiSession } from "#lib/server/auth/session.ts";
import { rateLimit } from "#lib/server/rate-limit.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";
import { getAiCompletionAsStream } from "#lib/server/infrastructure/ai.ts";
import { getObjectAsBlob } from "#lib/server/infrastructure/bucket.ts";
import { compressImageAsBase64 } from "#lib/server/infrastructure/images.ts";
import { chatMessageSchema } from "#lib/domain/chat-message.ts";
import { getChatPrompt } from "#lib/server/infrastructure/kv.ts";

const CONFIGS = {
	model: "@cf/google/gemma-4-26b-a4b-it" as keyof AiModels,
	seed: 42,
	temperature: 0.7,
	maxOutputTokens: 4500,
	enableThinking: false
} as const;

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = getApiSession(locals);
	await rateLimit(user.id);

	const json = await request.json();
	const result = await chatMessageSchema.safeParseAsync(json);

	if (!result.success || !result.data) {
		error(400);
	}

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

	let imageBase64: string | undefined;
	if (practiceSession.task.category === "1" && practiceSession.task.imageName) {
		const image = await getObjectAsBlob(practiceSession.task.imageName);
		if (image) {
			imageBase64 = await compressImageAsBase64(image);
		}
	}

	const systemPrompt = await getChatPrompt(practiceSession.task.category);

	const stream = await getAiCompletionAsStream(
		CONFIGS.model,
		[
			{ role: "system", content: systemPrompt },
			// Practice Session Context
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
					},
					messages: [...practiceSession.chatMessages, result.data],
					evaluation: practiceSession.evaluation?.result
				})
			},
			...(practiceSession.task.category === "1" && imageBase64
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
				: []),
			// AI evaluation
			...(practiceSession.evaluation
				? [{ role: "assistant" as const, content: JSON.stringify(practiceSession.evaluation) }]
				: []),
			// Chat messages
			...practiceSession.chatMessages.map((c) => ({ role: c.from, content: c.message }))
		],
		request.signal,
		{
			seed: CONFIGS.seed,
			thinking: CONFIGS.enableThinking,
			temperature: CONFIGS.temperature,
			maxCompletionToken: CONFIGS.maxOutputTokens
		}
	);

	return new Response(stream, {
		headers: { "cache-control": "no-cache", "content-type": "text/event-stream" }
	});
};
