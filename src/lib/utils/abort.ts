export function withTimeout(signal: AbortSignal | undefined, ms: number): AbortController {
	const controller = new AbortController();
	const timeout = setTimeout(() => {
		controller.abort();
	}, ms);
	if (signal) {
		signal.addEventListener("abort", () => {
			clearTimeout(timeout);
			controller.abort();
		});
	}
	return controller;
}
