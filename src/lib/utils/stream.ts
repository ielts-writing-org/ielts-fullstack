import { EventSourceParserStream, type EventSourceMessage } from "eventsource-parser/stream";

export async function readAiStream(
	stream: ReadableStream<Uint8Array<ArrayBuffer>>,
	onContent: (value: string) => unknown,
	onDone: () => unknown | Promise<unknown>
) {
	const reader = stream
		.pipeThrough(new TextDecoderStream())
		.pipeThrough(new EventSourceParserStream())
		.pipeThrough(
			new TransformStream<EventSourceMessage, string>({
				transform(chunk, controller) {
					if (chunk.data === "[DONE]") {
						return;
					}

					try {
						const json = JSON.parse(chunk.data);
						const content = json.choices?.[0]?.delta?.content;
						if (content) {
							controller.enqueue(content);
						}
					} catch {
						// Ignore non-JSON control signals or ping events
					}
				}
			})
		)
		.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			await onDone();
			break;
		}
		onContent(value);
	}
}
