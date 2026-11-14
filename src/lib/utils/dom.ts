/**
 * Resolves when a CSS transition ends on `element`, or after `timeoutMs` if
 * `transitionend` never fires (no transition, display:none, cancelled, ...).
 */
export function waitForTransition(element: HTMLElement, timeoutMs = 5000): Promise<void> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			element.removeEventListener("transitionend", onTransitionEnd);
			resolve();
		}, timeoutMs);

		const onTransitionEnd = () => {
			clearTimeout(timer);
			setTimeout(() => {
				resolve();
			}, 250);
		};

		element.addEventListener("transitionend", onTransitionEnd, { once: true });
	});
}
