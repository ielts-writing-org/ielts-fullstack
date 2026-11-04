import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { chatRequestSchema, type ChatRequest } from "#lib/domain/chat-request.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import { rateLimit } from "#lib/server/rate-limit.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";
import { chatWithAi, type ChatWithAiData } from "#lib/server/infrastructure/ai.ts";
import { getObjectAsBlob } from "#lib/server/infrastructure/bucket.ts";
import { compressImageAsBase64 } from "#lib/server/infrastructure/images.ts";

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	await rateLimit(getClientAddress());

	getApiSession(locals);

	const json = await request.json<ChatRequest>();
	const result = await chatRequestSchema.safeParseAsync(json);

	if (!result.success || !result.data) {
		error(400);
	}

	const chatData = await buildChatData(result.data);

	const stream = await chatWithAi(chatData, chatData.task.category, request.signal);

	return new Response(stream, {
		headers: { "cache-control": "no-cache", "content-type": "text/event-stream" }
	});
};

async function buildChatData({
	task,
	practiceSession,
	messages,
	evaluation
}: ChatRequest): Promise<ChatWithAiData> {
	if (task.category === "1" && task.imageName) {
		let imageBase64: string | undefined;
		if (task.imageName) {
			const image = await getObjectAsBlob(task.imageName);
			if (image) {
				imageBase64 = await compressImageAsBase64(image);
			}
		}

		return {
			task: {
				...task,
				...(task.imageName ? { image: imageBase64 } : {})
			},
			practiceSession: {
				...practiceSession,
				stats: computeDeterministicStats(practiceSession.response)
			},
			messages: messages,
			evaluation: evaluation
		};
	} else {
		return {
			task: task,
			practiceSession: {
				...practiceSession,
				stats: computeDeterministicStats(practiceSession.response)
			},
			messages: messages,
			evaluation: evaluation
		};
	}
}
