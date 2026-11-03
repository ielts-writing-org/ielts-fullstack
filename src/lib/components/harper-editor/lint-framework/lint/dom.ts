/** Minimal replacement for the `virtual-dom` package.
 *
 * The single `h` helper builds real DOM elements directly. It preserves the
 * property semantics the lint framework relied on from `virtual-dom`:
 *
 * - `style` objects are merged into `element.style` (camelCase keys).
 * - Function values (e.g. `onclick`) are assigned as DOM properties.
 * - `hook`/`unhook` objects keep the virtual-dom hook protocol: `hook` runs
 *   when the prop is applied; `unhookTree` runs it for discarded trees so
 *   listeners (e.g. the popup's Escape handler) can clean themselves up.
 * - Known DOM properties (`className`, `title`, `id`, `innerHTML`, ...) are
 *   set as properties; everything else becomes a real attribute, so
 *   `aria-*`/`role`/`data-*` work, which virtual-dom's expando assignment
 *   never achieved.
 */

export type Hook = {
	hook?: (node: Element, key: string) => void;
	unhook?: (node: Element, key: string) => void;
};

export type Props = Record<string, unknown>;

export type Child = Node | string | number | null | undefined | false;

type HookRecord = { key: string; hook: Hook };

const hooksKey = "__harperDomHooks";

/** Mirrors virtual-dom's hook detection: hook/unhook must be inherited, not own properties. */
function isHook(value: unknown): value is Hook {
	return (
		value != null &&
		((typeof (value as Hook).hook === "function" &&
			!Object.prototype.hasOwnProperty.call(value, "hook")) ||
			(typeof (value as Hook).unhook === "function" &&
				!Object.prototype.hasOwnProperty.call(value, "unhook")))
	);
}

function applyProp(node: HTMLElement, key: string, value: unknown) {
	if (value === undefined || value === null) {
		return;
	}

	if (key === "style" && typeof value === "object") {
		for (const [styleKey, styleValue] of Object.entries(value as Record<string, unknown>)) {
			(node.style as unknown as Record<string, string>)[styleKey] =
				styleValue === undefined ? "" : String(styleValue);
		}
		return;
	}

	if (key === "attributes" && typeof value === "object") {
		for (const [attr, attrValue] of Object.entries(value as Record<string, unknown>)) {
			if (attrValue === undefined) {
				node.removeAttribute(attr);
			} else {
				node.setAttribute(attr, String(attrValue));
			}
		}
		return;
	}

	if (isHook(value)) {
		const hooks: HookRecord[] = ((node as unknown as Record<PropertyKey, HookRecord[]>)[
			hooksKey
		] ??= []);
		hooks.push({ key, hook: value });
		value.hook?.(node, key);
		return;
	}

	if (typeof value === "function") {
		(node as unknown as Record<string, unknown>)[key] = value;
		return;
	}

	if (typeof value === "object") {
		const target = (node as unknown as Record<string, unknown>)[key];
		if (typeof target === "object" && target !== null) {
			for (const [mergeKey, mergeValue] of Object.entries(value as Record<string, unknown>)) {
				(target as Record<string, unknown>)[mergeKey] = mergeValue;
			}
		} else {
			(node as unknown as Record<string, unknown>)[key] = value;
		}
		return;
	}

	if (key in node) {
		(node as unknown as Record<string, unknown>)[key] = value;
	} else {
		node.setAttribute(key, String(value));
	}
}

/** Run `unhook` for every hook recorded on the given (discarded) subtree. */
export function unhookTree(node: Node) {
	if (node.nodeType !== Node.ELEMENT_NODE) {
		return;
	}

	const element = node as HTMLElement;
	const hooks = (element as unknown as Record<PropertyKey, HookRecord[] | undefined>)[hooksKey];
	if (hooks) {
		for (const { key, hook } of hooks) {
			hook.unhook?.(element, key);
		}
		delete (element as unknown as Record<PropertyKey, HookRecord[]>)[hooksKey];
	}

	for (const child of Array.from(element.childNodes)) {
		unhookTree(child);
	}
}

function appendChildren(node: HTMLElement, children: Child | Child[] | null | undefined) {
	if (children == null || children === false) {
		return;
	}

	if (Array.isArray(children)) {
		for (const child of children) {
			appendChildren(node, child);
		}
		return;
	}

	if (typeof children === "string" || typeof children === "number") {
		node.appendChild(document.createTextNode(String(children)));
		return;
	}

	node.appendChild(children);
}

/** Create an element, apply its properties, and append its children. */
export default function h(
	tag: string,
	props: Props = {},
	children: Child | Child[] | null | undefined = null
): HTMLElement {
	const node = document.createElement(tag);
	for (const [key, value] of Object.entries(props)) {
		applyProp(node, key, value);
	}
	appendChildren(node, children);
	return node;
}
