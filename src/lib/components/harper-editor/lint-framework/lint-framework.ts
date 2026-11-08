import type { LintOptions } from "harper.js";
import { closestBox, type IgnorableLintBox } from "./box";
import computeLintBoxes from "./compute-lint-boxes";
import { getCaretPosition, isHeading, isVisible } from "./dom-utils";
import Highlights from "./highlights";
import PopupHandler from "./popup-handler";
import { remapLintToCurrentSource } from "./span-mapping";
import type { UnpackedLint, UnpackedLintGroups } from "./unpack-lint";

type ActivationKey = "off" | "shift" | "control";

type Modifier = "Ctrl" | "Shift" | "Alt";

type Hotkey = {
	modifiers: Modifier[];
	key: string;
};

type FrameworkActions = {
	ignoreLint?: (hash: string) => Promise<void>;
	getActivationKey?: () => Promise<ActivationKey>;
	getHotkey?: () => Promise<Hotkey>;
	getDelay?: () => Promise<number>;
	openOptions?: () => Promise<void>;
	addToUserDictionary?: (words: string[]) => Promise<void>;
	reportError?: (lint: UnpackedLint, ruleId: string) => Promise<void>;
	setRuleEnabled?: (ruleId: string, enabled: boolean) => Promise<void> | void;
	afterLinting?: (lastBoxes: IgnorableLintBox[]) => Promise<void> | void;
};

/** Events on an input (any kind) that can trigger a re-render. */
const INPUT_EVENTS = ["focus", "keyup", "keydown", "paste", "change", "scroll", "input"] as const;
/** Events on the window that can trigger a re-render. */
const PAGE_EVENTS = ["resize", "compositionend", "selectionchange"] as const;

/** Orchestrates linting and rendering in response to events on the page. */
export default class LintFramework {
	private highlights: Highlights;
	private popupHandler: PopupHandler;
	private targets: Set<Node>;
	private scrollableAncestors: Set<HTMLElement>;
	private lintRequest: Promise<unknown> | null = null;
	private renderRequested = false;
	private lintDelayTimer: number | null = null;
	private lastInputAt: number = 0;
	private lastLints: { target: HTMLElement; lints: UnpackedLintGroups }[] = [];
	private lastBoxes: IgnorableLintBox[] = [];
	private updateEventCallbackRequested: boolean = false;

	/** The function to be called to re-render the highlights. This is a variable because it is used to register/deregister event listeners. */
	private updateEventCallback: () => void;

	/** Function used to fetch lints for a given text/domain. */
	private lintProvider: (
		text: string,
		domain: string,
		options?: LintOptions
	) => Promise<UnpackedLintGroups>;
	/** Actions wired by host environment (extension/app). */
	private actions: FrameworkActions;

	constructor(
		lintProvider: (
			text: string,
			domain: string,
			options?: LintOptions
		) => Promise<UnpackedLintGroups>,
		actions: FrameworkActions
	) {
		this.lintProvider = lintProvider;
		this.actions = actions;
		this.highlights = new Highlights();
		this.popupHandler = new PopupHandler({
			getActivationKey: actions.getActivationKey,
			openOptions: actions.openOptions,
			addToUserDictionary: actions.addToUserDictionary,
			reportError: actions.reportError,
			setRuleEnabled: actions.setRuleEnabled
		});
		this.targets = new Set();
		this.scrollableAncestors = new Set();
		this.lastLints = [];

		this.updateEventCallback = () => {
			this.update();
		};

		this.attachWindowListeners();
	}

	/** Returns the currents targets that are visible on-screen. */
	onScreenTargets(): Node[] {
		const onScreen = [] as Node[];

		for (const target of this.targets) {
			if (isVisible(target)) {
				onScreen.push(target);
			}
		}

		return onScreen;
	}

	async update() {
		if (this.updateEventCallbackRequested) return;

		this.updateEventCallbackRequested = true;
		requestAnimationFrame(() => {
			this.requestRender();
			this.requestLintUpdate();
			this.updateEventCallbackRequested = false;
		});
	}

	async requestLintUpdate(immediate = false): Promise<void> {
		const delay = (await this.actions.getDelay?.()) ?? 0;
		const remainingDelay = delay - (Date.now() - this.lastInputAt);

		// Extend the delay if there is one in effect (this is the debounce behavior).
		if (!immediate && delay > 0 && remainingDelay > 0) {
			if (this.lintDelayTimer != null) {
				window.clearTimeout(this.lintDelayTimer);
			}

			this.lintDelayTimer = window.setTimeout(() => {
				this.lintDelayTimer = null;
				this.requestLintUpdate();
			}, remainingDelay);

			return;
		}

		if (this.lintDelayTimer != null) {
			window.clearTimeout(this.lintDelayTimer);
			this.lintDelayTimer = null;
		}

		if (this.lintRequest != null) {
			if (!immediate) {
				return;
			}

			// An immediate refresh must run after the current request. Running them concurrently
			// allows an older result to finish last and redraw a lint that was just ignored.
			try {
				await this.lintRequest;
			} catch {
				// Still attempt the explicitly requested refresh after a failed background request.
			}
			await this.requestLintUpdate(true);
			return;
		}

		if (this.targets.size !== 0) {
			const request = Promise.all(
				this.onScreenTargets().map(async (target) => {
					if (!document.contains(target)) {
						this.targets.delete(target);
						return { target: null as HTMLElement | null, lints: {} };
					}

					const { text } = this.getTargetText(target);

					if (!text || text.length > 120000) {
						return { target: null as HTMLElement | null, lints: {} };
					}

					const language = getTargetLanguage(target);
					const lintsBySource = await this.lintProvider(text, window.location.hostname, {
						forceAllHeadings: isHeading(target),
						language
					});

					return { target: target as HTMLElement, lints: lintsBySource };
				})
			);

			this.lintRequest = request;
			const lintResults = await request.finally(() => {
				if (this.lintRequest === request) {
					this.lintRequest = null;
				}
			});
			this.lastLints = lintResults.filter(
				(r): r is (typeof lintResults)[number] & { target: HTMLElement } => r.target != null
			);
			this.requestRender();
		}
	}

	private handleLintHotKeyEvents = async (event: KeyboardEvent) => {
		const hotkey = await this.actions.getHotkey?.();

		if (!hotkey) return;

		const key = event.key.toLowerCase();
		const expectedKey = hotkey.key.toLowerCase();

		const hasCtrl = event.ctrlKey === hotkey.modifiers.includes("Ctrl");
		const hasAlt = event.altKey === hotkey.modifiers.includes("Alt");
		const hasShift = event.shiftKey === hotkey.modifiers.includes("Shift");

		const match = key === expectedKey && hasCtrl && hasAlt && hasShift;

		if (match) {
			event.preventDefault();
			event.stopImmediatePropagation();

			const caretPosition = getCaretPosition();

			if (caretPosition != null) {
				const closestIdx = closestBox(caretPosition, this.lastBoxes);

				if (closestIdx < 0) {
					return;
				}

				const previousBox = this.lastBoxes[closestIdx];
				const suggestions = previousBox.lint.suggestions;
				if (suggestions.length > 0) {
					previousBox.applySuggestion(suggestions[0]);
				} else {
					previousBox.ignoreLint?.();
				}
			}
		}
	};

	/**
	 * Hotkey to apply the suggestion of the most likely word
	 */
	public async lintHotkey() {
		document.addEventListener("keydown", this.handleLintHotKeyEvents, { capture: true });
	}

	public async addTarget(target: Node) {
		if (!this.targets.has(target)) {
			this.targets.add(target);
			this.update();
			this.attachTargetListeners(target);
		}
	}

	public async removeTarget(target: HTMLElement) {
		if (this.targets.has(target)) {
			this.targets.delete(target);
			this.update();
			this.detachTargetListeners(target);
		} else {
			throw new Error("HTMLElement not added.");
		}
	}

	private attachTargetListeners(target: Node) {
		for (const event of INPUT_EVENTS) {
			target.addEventListener(event, this.updateEventCallback);
		}

		const scrollableAncestors = getScrollableAncestors(target);

		for (const el of scrollableAncestors) {
			if (!this.scrollableAncestors.has(el as HTMLElement)) {
				this.scrollableAncestors.add(el as HTMLElement);
				(el as HTMLElement).addEventListener("scroll", this.updateEventCallback, {
					capture: true,
					passive: true
				});
			}
		}
	}

	private detachTargetListeners(target: HTMLElement) {
		for (const event of INPUT_EVENTS) {
			target.removeEventListener(event, this.updateEventCallback);
		}
	}

	private attachWindowListeners() {
		this.lintHotkey();
		for (const event of PAGE_EVENTS) {
			window.addEventListener(event, this.updateEventCallback);
		}
	}

	private getTargetText(target: Node): {
		text: string | null;
	} {
		const text: string =
			target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
				? target.value
				: (target as HTMLElement).innerText;

		return { text };
	}

	private requestRender() {
		if (this.renderRequested) {
			return;
		}

		this.lastInputAt = Date.now();

		this.renderRequested = true;

		requestAnimationFrame(() => {
			const boxes = this.lastLints.flatMap(({ target, lints }) => {
				if (!target) {
					return [];
				}

				const { text } = this.getTargetText(target);
				if (text == null) {
					return [];
				}

				return Object.entries(lints).flatMap(([ruleName, ls]) =>
					ls.flatMap((lint) => {
						const currentLint = remapLintToCurrentSource(lint, text);
						if (currentLint == null) {
							return [];
						}

						return computeLintBoxes(target, currentLint, ruleName, {
							ignoreLint: this.actions.ignoreLint
								? async (hash: string) => {
										await this.actions.ignoreLint?.(hash);
										await this.requestLintUpdate(true);
									}
								: undefined
						});
					})
				);
			});
			this.lastBoxes = boxes;
			this.highlights.renderLintBoxes(boxes);
			this.popupHandler.updateLintBoxes(boxes);

			this.renderRequested = false;

			this.actions.afterLinting?.(this.lastBoxes);
		});
	}

	public removeAllEventListeners() {
		document.removeEventListener("keydown", this.handleLintHotKeyEvents, { capture: true });
		for (const event of PAGE_EVENTS) {
			window.removeEventListener(event, this.updateEventCallback);
		}

		if (this.lintDelayTimer != null) {
			clearTimeout(this.lintDelayTimer);
			this.lintDelayTimer = null;
		}

		for (const el of this.scrollableAncestors) {
			el.removeEventListener("scroll", this.updateEventCallback, {
				capture: true
			});
		}
		this.scrollableAncestors.clear();

		for (const target of this.targets) {
			for (const event of INPUT_EVENTS) {
				target.removeEventListener(event, this.updateEventCallback);
			}
		}
		this.targets.clear();

		this.highlights.destroy();
		this.popupHandler.destroy();
	}
}

/**
 * Returns all scrollable ancestor elements of a given element,
 * ordered from nearest to furthest (ending with the page scroller).
 */
function getScrollableAncestors(element: Node): Element[] {
	const scrollables: Element[] = [];
	const root = document.scrollingElement || document.documentElement;
	let parent = element.parentElement;

	while (parent) {
		const style = window.getComputedStyle(parent);
		const { overflowY, overflowX } = style;
		const canScrollY = overflowY.includes("auto") || overflowY.includes("scroll");
		const canScrollX = overflowX.includes("auto") || overflowX.includes("scroll");

		if (canScrollY || canScrollX) {
			scrollables.push(parent);
		}
		parent = parent.parentElement;
	}

	// Always include the document scroller at the end
	if (root && scrollables[scrollables.length - 1] !== root) {
		scrollables.push(root);
	}

	return scrollables;
}

function getTargetLanguage(target: Node): LintOptions["language"] | undefined {
	if (!(target instanceof Element)) return undefined;

	const language = target.getAttribute("data-language");
	switch (language) {
		case "plaintext":
		case "markdown":
		case "typst":
			return language;
		default:
			return undefined;
	}
}
