import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { evaluateRequestSchema, type EvaluateRequest } from "#lib/domain/evaluate-request.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import { rateLimit } from "#lib/server/rate-limit.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";
import { evaluateWithAi, type EvaluateWithAiData } from "#lib/server/infrastructure/ai.ts";
import { getObjectAsBlob } from "#lib/server/infrastructure/bucket.ts";
import { compressImageAsBase64 } from "#lib/server/infrastructure/images.ts";

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = getApiSession(locals);
	await rateLimit(user.id);

	const json = await request.json();
	const validationResult = evaluateRequestSchema.safeParse(json);

	if (!validationResult.success || !validationResult.data) {
		error(400);
	}

	const evaluateData = await buildEvaluateData(validationResult.data);

	const stream = await evaluateWithAi(evaluateData, evaluateData.task.category, request.signal);

	return new Response(stream, {
		headers: { "cache-control": "no-cache", "content-type": "text/event-stream" }
	});
};

async function buildEvaluateData({
	task,
	practiceSession
}: EvaluateRequest): Promise<EvaluateWithAiData> {
	if (task.category === "1") {
		const image = await getObjectAsBlob(task.imageName);

		if (!image) {
			error(400);
		}

		return {
			task: {
				...task,
				image: await compressImageAsBase64(image)
			},
			practiceSession: {
				...practiceSession,
				stats: computeDeterministicStats(practiceSession.response)
			}
		};
	} else {
		return {
			task: task,
			practiceSession: {
				...practiceSession,
				stats: computeDeterministicStats(practiceSession.response)
			}
		};
	}
}
