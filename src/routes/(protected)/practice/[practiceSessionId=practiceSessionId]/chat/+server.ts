import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { getApiSession } from "#lib/server/auth/session.ts";
import { getRateLimiter, rateLimit } from "#lib/server/bindings/rate-limit.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { chatMessageSchema } from "#lib/domain/chat-message.ts";
import { getObjectAsBlob } from "#lib/server/bindings/bucket.ts";
import { compressImageAsBase64 } from "#lib/server/bindings/images.ts";
import { getAiCompletionAsStream } from "#lib/server/bindings/ai.ts";
import { DEFAULT_AI_RUNTIME, getAiRuntimeConfig, getChatPrompt } from "#lib/server/ai-settings.ts";
import { failAiRequest, reserveAiRequest, trackAiStream } from "#lib/server/ai-telemetry.ts";
import type { TaskCategory } from "#lib/domain/task-category.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";
import { getImagePath } from "#lib/utils/paths.ts";

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = getApiSession(locals);
	await rateLimit(user.id, getRateLimiter("chat"));

	const chatMessage = getValidatedChatMessage(await request.json());
	const ps = await getValidatedPracticeSession(params.practiceSessionId, user.id);
	const imageBase64 = await getTaskImageAsBase64(ps.task.category, ps.task.imageName);
	const runtime = await getAiRuntimeConfig({
		...DEFAULT_AI_RUNTIME,
		seed: 2026,
		temperature: 0.7
	});
	const telemetry = await reserveAiRequest(user.id, ps.id, "chat", runtime.chatModel, runtime);

	let stream: ReadableStream;
	try {
		stream = await getAiCompletionAsStream(
			runtime.chatModel,
			[
				{ role: "system", content: await getChatPrompt(ps.task.category) },
				{
					role: "user",
					content: [
						...(imageBase64
							? [{ type: "image_url" as const, image_url: { url: imageBase64 } }]
							: []),
						{ type: "text", text: `Task Prompt:\n\n${ps.task.prompt}` }
					]
				},
				{
					role: "user",
					content: [
						{ type: "text", text: `Task Response:\n\n${ps.response}` },
						{ type: "text", text: JSON.stringify(computeDeterministicStats(ps.response)) }
					]
				},
				...(ps.evaluation
					? [{ role: "assistant" as const, content: JSON.stringify(ps.evaluation.result) }]
					: []),
				...[...ps.chatMessages].reverse().map((message) => ({
					role: message.from,
					content: message.message
				})),
				{ role: "user", content: chatMessage.message }
			],
			request.signal,
			{
				seed: runtime.seed,
				instantMode: !runtime.enableThinking,
				temperature: runtime.temperature,
				maxCompletionToken: runtime.maxOutputTokens,
				sessionAffinity: ps.id
			}
		);
	} catch (cause) {
		await failAiRequest(telemetry.id, telemetry.startedAt, "AI provider request failed");
		throw cause;
	}

	return new Response(trackAiStream(stream, telemetry.id, telemetry.startedAt), {
		headers: { "cache-control": "no-cache", "content-type": "text/event-stream" }
	});
};

function getValidatedChatMessage(json: unknown) {
	const result = chatMessageSchema.safeParse(json);
	if (!result.success) error(400);
	return result.data;
}

async function getValidatedPracticeSession(id: string, userId: string) {
	const db = getDatabase();
	const ps = await db.query.practiceSessions.findFirst({
		columns: { id: true, response: true },
		where: {
			id: id,
			userId: userId,
			deletedAt: {
				isNull: true
			}
		},
		with: {
			task: {
				columns: { category: true, prompt: true, imageName: true }
			},
			evaluation: { columns: { result: true } },
			chatMessages: {
				columns: { from: true, message: true },
				limit: 10
			}
		}
	});

	if (!ps) error(404);
	return ps;
}

async function getTaskImageAsBase64(category: TaskCategory, name: string | null) {
	if (category !== "1" || !name) return undefined;

	const image = await getObjectAsBlob(getImagePath(name));
	if (!image) error(400);
	return compressImageAsBase64(image);
}
