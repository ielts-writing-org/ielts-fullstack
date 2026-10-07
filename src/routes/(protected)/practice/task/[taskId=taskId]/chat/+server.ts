import { computeDeterministicStats } from "#lib/utils/stats.ts";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { parseChatRequestForm } from "./utils";
import type { AiClientMessages } from "#lib/server/infra/external/ai-client/ai-client.port.ts";

// TODO: Rate limit
export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.session) error(401, "Unauthorized");

	const formData = await request.formData();
	const pForm = parseChatRequestForm(formData);

	const taskContext = {
		...pForm.taskContext,
		stats: computeDeterministicStats(pForm.taskContext.response)
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
				...(pForm.taskContext.id === "1" && pForm.taskContext.image
					? [
							{
								type: "image_url" as const,
								image_url: { url: await locals.imagesClient.compress(pForm.taskContext.image) }
							}
						]
					: [])
			]
		},
		// AI previous evaluation
		...(pForm.evaluation
			? [{ role: "assistant" as const, content: JSON.stringify(pForm.evaluation) }]
			: []),
		// Chat messages
		...pForm.messages.map((c) => ({
			role: c.from,
			content: [{ type: "text" as const, text: c.message }]
		}))
	] satisfies AiClientMessages;

	const stream = await locals.aiClient.chat(messages, params.taskId, request.signal);

	return new Response(stream, {
		headers: {
			"content-type": "text/event-stream",
			"cache-control": "no-cache",
			Connection: "keep-alive"
		}
	});
};
