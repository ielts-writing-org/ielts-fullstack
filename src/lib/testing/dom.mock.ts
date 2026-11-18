/**
 * Unit-test stand-in for `waitForTransition`, applied via
 * `vi.mock("#lib/utils/dom.ts", async () => await import("#lib/testing/dom.mock.ts"))`.
 *
 * Real modal transitions depend on CSS animation timing and make open/close
 * sequences slow and order-sensitive in tests (waitForTransition can miss
 * `transitionend` and fall back to its 5s timeout, leaking pending opens and
 * closes across tests). Tests assert end states, not timing, so resolve
 * immediately; real transition timing is covered by the e2e flows.
 */
export function waitForTransition(): Promise<void> {
	return Promise.resolve();
}
