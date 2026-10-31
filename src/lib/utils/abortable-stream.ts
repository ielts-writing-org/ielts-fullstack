export async function abortableStream(
	promise: Promise<ReadableStream>,
	signal: AbortSignal
): Promise<ReadableStream> {
	const stream = await promise;

	if (signal.aborted) {
		cancel(stream);
		return stream;
	}

	signal.addEventListener("abort", () => cancel(stream), { once: true });

	return stream;
}

export function cancel(stream: ReadableStream) {
	try {
		void stream.cancel().catch(() => {});
	} catch {
		// already locked by the response pipeline; cancellation propagates upstream on its own
	}
}
