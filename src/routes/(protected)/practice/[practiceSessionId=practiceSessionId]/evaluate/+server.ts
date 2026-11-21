import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { evaluateRequestSchema } from "#lib/domain/evaluate-request.ts";
import { evaluationSchema } from "#lib/domain/evaluation.ts";
import type { TaskCategory } from "#lib/domain/task-category.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import { getRateLimiter, rateLimit } from "#lib/server/bindings/rate-limit.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { getObjectAsBlob } from "#lib/server/bindings/bucket.ts";
import { compressImageAsBase64 } from "#lib/server/bindings/images.ts";
import { getAiCompletionAsStream } from "#lib/server/bindings/ai.ts";
import {
	DEFAULT_AI_RUNTIME,
	getAiRuntimeConfig,
	getEvaluationPrompt
} from "#lib/server/ai-settings.ts";
import { failAiRequest, reserveAiRequest, trackAiStream } from "#lib/server/ai-telemetry.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";
import { getImagePath } from "#lib/utils/paths.ts";

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = getApiSession(locals);
	await rateLimit(user.id, getRateLimiter("evaluate"));

	const ps = await getValidatedPracticeSession(params.practiceSessionId, user.id);
	const imageBase64 = await getTaskImageAsBase64(ps.task.category, ps.task.imageName);
	const runtime = await getAiRuntimeConfig({
		...DEFAULT_AI_RUNTIME,
		seed: 2026,
		temperature: 0.2
	});
	const telemetry = await reserveAiRequest(
		user.id,
		ps.id,
		"grading",
		runtime.gradingModel,
		runtime
	);

	let stream: ReadableStream;
	try {
		stream = await getAiCompletionAsStream(
			runtime.gradingModel,
			[
				{ role: "system", content: await getEvaluationPrompt(ps.task.category) },
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
				}
			],
			request.signal,
			{
				seed: runtime.seed,
				instantMode: true,
				temperature: runtime.temperature,
				maxCompletionToken: runtime.maxOutputTokens,
				responseSchema: evaluationSchema.toJSONSchema(),
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
			}
		}
	});
	if (!ps) error(404);

	const result = evaluateRequestSchema.safeParse({
		task: {
			category: ps.task.category,
			prompt: ps.task.prompt,
			imageName: ps.task.imageName
		},
		practiceSession: { response: ps.response }
	});
	if (!result.success) {
		error(400);
	}

	return ps;
}

async function getTaskImageAsBase64(category: TaskCategory, name: string | null) {
	if (category === "2") {
		return undefined;
	}

	if (!name) {
		error(400);
	}

	const image = await getObjectAsBlob(getImagePath(name));
	if (!image) {
		error(400);
	}

	return await compressImageAsBase64(image);
}
