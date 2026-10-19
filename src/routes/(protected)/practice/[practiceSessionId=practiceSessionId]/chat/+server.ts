import { AiClient } from "#lib/server/infrastructure/ai-client.ts";
import { ImagesClient } from "#lib/server/infrastructure/images-client.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { parseChatRequestForm } from "./utils";

// TODO: Rate limit
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.session) error(401, "Unauthorized");

	const formData = await request.formData();
	const pForm = parseChatRequestForm(formData);

	const taskContext = {
		...pForm.taskContext,
		stats: computeDeterministicStats(pForm.taskContext.response)
	};

	const stream = await AiClient.instance.chat(
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
					...(pForm.taskContext.category === "1" && pForm.taskContext.image
						? [
								{
									image_url: {
										url: await ImagesClient.instance.compress(pForm.taskContext.image)
									},
									type: "image_url" as const
								}
							]
						: [])
				],
				role: "user"
			},
			// AI previous evaluation
			...(pForm.evaluation
				? [{ content: JSON.stringify(pForm.evaluation), role: "assistant" as const }]
				: []),
			// Chat messages
			...pForm.messages.map((c) => ({
				content: [{ text: c.message, type: "text" as const }],
				role: c.from
			}))
		],
		pForm.taskContext.category,
		request.signal
	);

	return new Response(stream, {
		headers: {
			"cache-control": "no-cache",
			Connection: "keep-alive",
			"content-type": "text/event-stream"
		}
	});
};
