import type { RequestHandler } from "./$types";
import { env } from "cloudflare:workers";
import { evaluateRequestSchema } from "#lib/schemas/evaluate-request.ts";
import type { ApiResult } from "#lib/schemas/api-result.ts";
import { getApiSession } from "#lib/server/auth/index.ts";
import { rateLimit } from "#lib/server/rate-limit.ts";
import { getZodErrors } from "#lib/utils/error.ts";
import { CfConfigProvider } from "#lib/server/infrastructure/config-provider/config-provider.cf.ts";
import { CfBucketClient } from "#lib/server/infrastructure/bucket-client/bucket-client.cf.ts";
import { CfImagesClient } from "#lib/server/infrastructure/images-client/images-client.cf.ts";
import { CfEvaluationClient } from "./evaluation-client.cf";
import { EvaluateHandler } from "./evaluate.handler";

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	await rateLimit(getClientAddress);
	getApiSession(locals);

	const json = await request.json();
	const validationResult = evaluateRequestSchema.safeParse(json);

	if (!validationResult.success || !validationResult.data) {
		return Response.json(
			{
				success: false,
				error: {
					type: "validation",
					fields: getZodErrors(validationResult.error)
				}
			} satisfies ApiResult,
			{ status: 400 }
		);
	}

	const configProvider = new CfConfigProvider(env.IELTS_WRITING_KV);
	const evaluationClient = new CfEvaluationClient(configProvider, env.IELTS_WRITING_AI);
	const bucketClient = new CfBucketClient(env.IELTS_WRITING_BUCKET);
	const imagesClient = new CfImagesClient(env.IELTS_WRITING_IMAGES);
	const handler = new EvaluateHandler(evaluationClient, bucketClient, imagesClient);

	const handlerResult = await handler.execute(validationResult.data, request.signal);
	if (!handlerResult.success) {
		return Response.json(
			{
				success: false,
				error: {
					type: "bad_request",
					message: handlerResult.message
				}
			} satisfies ApiResult,
			{ status: 400 }
		);
	}

	return new Response(handlerResult.stream, {
		headers: { "cache-control": "no-cache", "content-type": "text/event-stream" }
	});
};
