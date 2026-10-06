import { chatRequestSchema, type ChatRequest } from "#lib/schemas/chat-request.ts";

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

export function buildChatRequestFormData(request: ChatRequest) {
	const form = new FormData();

	form.set(
		"request",
		JSON.stringify(request, (k, v) => (k === "image" ? undefined : (v as unknown)))
	);

	if (request.taskContext.id === "1" && request.taskContext.image) {
		form.set("taskContextImage", request.taskContext.image);
	}

	return form;
}
