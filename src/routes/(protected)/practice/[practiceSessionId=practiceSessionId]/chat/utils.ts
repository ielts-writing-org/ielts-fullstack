import { type ChatRequest, chatRequestSchema } from "#lib/schemas/chat-request.ts";

export function buildChatRequestFormData(request: ChatRequest) {
	const form = new FormData();

	form.set(
		"request",
		JSON.stringify(request, (k, v) => (k === "image" ? undefined : (v as unknown)))
	);

	if (request.taskContext.category === "1" && request.taskContext.image) {
		form.set("taskContextImage", request.taskContext.image);
	}

	return form;
}

export function parseChatRequestForm(formData: FormData): ChatRequest {
	const request = formData.get("request");

	if (typeof request !== "string") {
		throw new Error("Missing 'request'");
	}

	const data = JSON.parse(request);

	const image = formData.get("taskContextImage");

	return chatRequestSchema.parse({
		...data,
		taskContext: {
			...data.taskContext,
			...(image instanceof File ? { image } : {})
		}
	});
}
