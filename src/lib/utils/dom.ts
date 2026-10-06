export function waitForTransition(element: HTMLElement): Promise<void> {
	return new Promise((resolve) => {
		element.addEventListener("transitionend", () => resolve(), {
			once: true
		});
	});
}
