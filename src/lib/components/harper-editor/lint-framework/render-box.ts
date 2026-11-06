import { unhookTree } from "./dom";

type ParentResolver = () => Node;

/** Renders a DOM tree into an isolated shadow root that is unaffected by the style of the rest of the page. */
export default class RenderBox {
	/** The node we reattach into if a host is removed by editor-managed DOM updates. */
	private parentResolver: ParentResolver;
	/** The shadow root the rendered tree lives in. */
	private shadowRoot: ShadowRoot | undefined;
	/** The shadow DOM host the rendered tree is attached to. */
	private shadowHost: HTMLElement;

	constructor(parent: Node | ParentResolver) {
		this.parentResolver = typeof parent === "function" ? parent : () => parent;
		this.shadowHost = document.createElement("harper-render-box");
		this.parentResolver().appendChild(this.shadowHost);
	}

	/** Render to the box, replacing any previously rendered tree. */
	public render(node: HTMLElement) {
		if (!this.shadowHost.isConnected) {
			this.parentResolver().appendChild(this.shadowHost);
		}

		if (this.shadowRoot === undefined) {
			this.shadowRoot = this.shadowHost.attachShadow({ mode: "open" });
		}

		for (const child of Array.from(this.shadowRoot.childNodes)) {
			unhookTree(child);
		}
		this.shadowRoot.replaceChildren(node);
	}

	/** Remove the box from the DOM. */
	public remove() {
		try {
			this.shadowHost.remove();
		} catch (e) {
			console.error(e);
		}

		if (this.shadowRoot !== undefined) {
			for (const child of Array.from(this.shadowRoot.childNodes)) {
				unhookTree(child);
			}
		}
		this.shadowRoot = undefined;
	}

	public getShadowHost(): HTMLElement {
		return this.shadowHost;
	}
}
