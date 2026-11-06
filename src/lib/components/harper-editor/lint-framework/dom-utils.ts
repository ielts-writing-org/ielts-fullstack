import type { Span } from "harper.js";
import { type Box, type SourceElement, domRectToBox, isBoxInScreen } from "./box";
import TextFieldRange from "./text-field-range";

/**
 * Turn a `NodeList` into a normal JavaScript array.
 * @param list
 */
export function extractFromNodeList<T extends Node>(list: NodeListOf<T>): T[] {
	const elements: T[] = [];

	for (let i = 0; i < list.length; i++) {
		const item = list[i];
		elements.push(item);
	}

	return elements;
}

/**
 * Flatten a provided node, and its children into a single array.
 * @param node
 */
export function leafNodes(node: Node): Node[] {
	const out: Node[] = [];

	const children = extractFromNodeList(node.childNodes);

	if (children.length === 0) {
		return [node];
	}

	for (const child of children) {
		const sub = leafNodes(child);
		sub.forEach((v) => {
			out.push(v);
		});
	}

	return out;
}

/**
 * Given an element and a Span of text inside it, compute the Range that represents the region of the DOM represented.
 * Accounts for `<br>` elements which `innerText` converts to newlines.
 * @param target
 * @param span
 */
export function getRangeForTextSpan(target: Element, span: Span): Range | null {
	const children = leafNodes(target);

	const range = document.createRange();
	let traversed = 0;

	let startFound = false;

	for (let i = 0; i < children.length; i++) {
		const child = children[i] as HTMLElement;

		if (child.nodeName === "BR") {
			traversed += 1;
			continue;
		}

		const childText = child.textContent ?? "";

		if (traversed + childText.length > span.start && !startFound) {
			range.setStart(child, span.start - traversed);
			startFound = true;
		}

		if (startFound && traversed + childText.length >= span.end) {
			range.setEnd(child, span.end - traversed);
			return range;
		}

		traversed += childText?.length ?? 0;
	}

	return null;
}

const sharedRange: Range | null = typeof document !== "undefined" ? document.createRange() : null;

/** Check if a node represents a heading (native heading tags or role="heading"). */
export function isHeading(node: Node): boolean {
	if (!(node instanceof Element)) return false;

	const tag = node.tagName.toLowerCase();
	if (/^h[1-6]$/.test(tag)) return true;

	const role = node.getAttribute("role");
	return role?.toLowerCase() === "heading";
}

/** Check if an element is visible to the user.
 *
 * It is coarse and meant for performance improvements, not precision.*/
export function isVisible(node: Node): boolean {
	try {
		if (!node || !node.ownerDocument) return false;

		if (node instanceof Element) {
			if (!node.isConnected) return false;

			const rect = node.getBoundingClientRect();
			if (!isBoxInScreen(rect)) return false;
			const cv = node.checkVisibility;
			if (typeof cv === "function") return cv.call(node);
			const cs = getComputedStyle(node);
			if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
			return true;
		}

		if (!sharedRange) return false;
		const parent = node.parentElement as Element | null;
		if (parent && !parent.isConnected) return false;
		sharedRange.selectNode(node);
		const rect = sharedRange.getBoundingClientRect();
		return isBoxInScreen(rect);
	} catch {
		return false;
	}
}

export function findAncestor(
	el: SourceElement,
	predicate: (el: SourceElement) => boolean
): SourceElement | null {
	let current: SourceElement | null = el;
	while (current != null) {
		if (predicate(current)) return current;
		current = current.parentElement;
	}
	return null;
}

export function getQuillJsRoot(el: SourceElement): SourceElement | null {
	return findAncestor(
		el,
		(node: SourceElement) => !isTextNode(node) && node.classList.contains("ql-container")
	);
}

export function getCaretPosition(): Box | null {
	const active = document.activeElement;

	if (
		active instanceof HTMLTextAreaElement ||
		(active instanceof HTMLInputElement && active.type === "text")
	) {
		if (
			active.selectionStart == null ||
			active.selectionEnd == null ||
			active.selectionStart !== active.selectionEnd
		) {
			return null;
		}

		const offset = active.selectionStart;
		const tfRange = new TextFieldRange(active, offset, offset);
		const rects = tfRange.getClientRects();
		tfRange.detach();

		return rects.length ? domRectToBox(rects[0]) : null;
	}

	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return null;

	const range = selection.getRangeAt(0);
	if (!range.collapsed) return null;

	return domRectToBox(range.getBoundingClientRect());
}

export function isFormEl(el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement {
	return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

export function isTextNode(el: SourceElement): el is Text {
	return el.nodeType === Node.TEXT_NODE;
}
