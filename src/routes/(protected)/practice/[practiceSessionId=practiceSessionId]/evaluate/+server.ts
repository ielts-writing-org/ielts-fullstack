import { error } from "@sveltejs/kit";
import { AiClient } from "#lib/server/infrastructure/ai-client.ts";
import { ImagesClient } from "#lib/server/infrastructure/images-client.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";
import type { RequestHandler } from "./$types";
import { parseEvaluateRequestForm } from "./utils";

// TODO: Rate limit
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.session) error(401);

	const form = await request.formData();
	const pForm = parseEvaluateRequestForm(form);

	const taskContext = {
		...pForm,
		stats: computeDeterministicStats(pForm.response)
	};

	const stream = await AiClient.instance.evaluate(
		[
			// Task context
			{
				content: [
					// Task context without image
					{
						text: JSON.stringify(taskContext, (k, v) =>
							k === "image" ? undefined : (v as unknown)
						),
						type: "text"
					},
					// Task context image
					...(pForm.id === "1" && pForm.image
						? [
								{
									image_url: { url: await ImagesClient.instance.compress(pForm.image) },
									type: "image_url" as const
								}
							]
						: [])
				],
				role: "user"
			}
		],
		pForm.id,
		request.signal
	);

	return new Response(stream, {
		headers: { "cache-control": "no-cache", "content-type": "text/event-stream" }
	});
};
