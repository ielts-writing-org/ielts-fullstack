import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { chatMessageSchema } from "#lib/domain/chat-message.ts";
import { computeDeterministicStats } from "#lib/domain/text-stats.ts";
import { DEFAULT_AI_RUNTIME } from "#lib/domain/ai-config.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import { getRateLimiter, rateLimit } from "#lib/server/bindings/rate-limit.ts";
import { getAiCompletionAsStream } from "#lib/server/bindings/ai.ts";
import { getAiRuntimeConfig, getChatPrompt } from "#lib/server/services/ai-settings.ts";
import { failAiRequest, reserveAiRequest } from "#lib/server/data/ai-requests.ts";
import { trackAiStream } from "#lib/server/services/ai-telemetry.ts";
import { findAiChatContext } from "#lib/server/data/practice-sessions.ts";
import { getTaskImageAsBase64DataUrl } from "#lib/server/services/task-images.ts";

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = getApiSession(locals);
	await rateLimit(user.id, getRateLimiter("chat"));

	const chatMessage = getValidatedChatMessage(await request.json());
	const ps = await getValidatedPracticeSession(params.practiceSessionId, user.id);
	const imageBase64 = await getTaskImageAsBase64DataUrl(ps.task.imageName);
	const runtime = await getAiRuntimeConfig({
		...DEFAULT_AI_RUNTIME,
		seed: 2026,
		temperature: 0.7
	});
	const telemetry = await reserveAiRequest(
		user.id,
		ps.id,
		"chat",
		runtime.chatModel,
		runtime.chatDailyLimit
	);
	if (!telemetry) error(429, `Daily chat quota reached. Resets at 00:00 UTC.`);

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
	const ps = await findAiChatContext(userId, id);
	if (!ps) error(404);
	return ps;
}
