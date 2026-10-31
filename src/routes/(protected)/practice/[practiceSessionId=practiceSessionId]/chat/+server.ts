import { chatRequestSchema, type ChatRequest } from "#lib/schemas/chat-request.ts";
import { getApiSession } from "#lib/server/auth/index.ts";
import { AiClient } from "#lib/server/infrastructure/ai-client.ts";
import { rateLimit } from "#lib/server/rate-limit.ts";
import { computeDeterministicStats, type DeterministicStats } from "#lib/utils/stats.ts";
import type { RequestHandler } from "./$types";
import { getZodErrors } from "#lib/utils/error.ts";
import { env } from "cloudflare:workers";
import { CfImagesClient } from "#lib/server/infrastructure/images-client/images-client.cf.ts";

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	await rateLimit(getClientAddress);

	getApiSession(locals);

	const json = await request.json<ChatRequest>();
	const result = await chatRequestSchema.safeParseAsync(json);

	if (!result.success || !result.data) {
		return Response.json(
			{
				success: false,
				zodErrors: getZodErrors(result.error)
			},
			{ status: 400 }
		);
	}

	const validatedJson = {
		...result.data,
		practiceSession: {
			response: result.data.practiceSession.response,
			stats: computeDeterministicStats(result.data.practiceSession.response)
		}
	} satisfies ChatRequest & {
		practiceSession: { stats: DeterministicStats };
	};

	let imageBase64: string | undefined;
	if (validatedJson.task.category === "1" && validatedJson.task.imageName) {
		const image = await env.IELTS_WRITING_BUCKET.get(validatedJson.task.imageName);
		if (image) {
			const blob = await image.blob();
			const imagesClient = new CfImagesClient(env.IELTS_WRITING_IMAGES);
			imageBase64 = await imagesClient.compress(blob);
		}
	}

	const stream = await AiClient.instance.chat(
		[
			// Task context
			{
				role: "user",
				content: [
					{
						type: "text",
						text: JSON.stringify(validatedJson)
					},
					...(imageBase64
						? [
								{
									type: "image_url" as const,
									image_url: { url: imageBase64 }
								}
							]
						: [])
				]
			},
			// Previous AI evaluation
			...(validatedJson.evaluation
				? [{ role: "assistant" as const, content: JSON.stringify(validatedJson.evaluation) }]
				: []),
			// Chat messages
			...validatedJson.messages.map((c) => ({
				role: c.from,
				content: [{ type: "text" as const, text: c.message }]
			}))
		],
		validatedJson.task.category,
		request.signal
	);

	return new Response(stream, {
		headers: { "cache-control": "no-cache", "content-type": "text/event-stream" }
	});
};
