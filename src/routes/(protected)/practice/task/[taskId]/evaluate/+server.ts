import type { AiClientMessages } from "#lib/infra/external/ai-client/ai-client.port.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";
import { isValidTaskId } from "#lib/utils/task-id.ts";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { parseEvaluateRequestForm } from "./utils";

// TODO: Rate limit
export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.session) error(401, "Unauthorized");
	if (!isValidTaskId(params.taskId)) error(400, "Bad Request");

	const form = await request.formData();
	const pForm = parseEvaluateRequestForm(form);

	const taskContext = {
		...pForm,
		stats: computeDeterministicStats(pForm.response)
	};

	const messages = [
		// Task context
		{
			role: "user",
			content: [
				// Task context without image
				{
					type: "text",
					text: JSON.stringify(taskContext, (k, v) => (k === "image" ? undefined : (v as unknown)))
				},
				// Task context image
				...(pForm.id === "1" && pForm.image
					? [
							{
								type: "image_url" as const,
								image_url: { url: await locals.imagesClient.compress(pForm.image) }
							}
						]
					: [])
			]
		}
	] satisfies AiClientMessages;

	const stream = await locals.aiClient.evaluate(messages, params.taskId, request.signal);

	return new Response(stream, {
		headers: { "content-type": "text/event-stream", "cache-control": "no-cache" }
	});
};
