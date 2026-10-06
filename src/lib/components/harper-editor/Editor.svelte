<script lang="ts">
	import type { Lint, Linter } from "harper.js";
	import type Quill from "quill";
	import {
		type EditorFontFamily,
		type EditorFontSize,
		fontStackFor,
		normalizeFontFamily,
		normalizeFontSize
	} from "./editor-display";
	import LintFramework from "./lint-framework/lint/lint-framework";
	import type { UnpackedLintGroups } from "./lint-framework/lint/unpack-lint";
	import unpackLint from "./lint-framework/lint/unpack-lint";
	import StatusBar from "./StatusBar.svelte";
	import type { IgnorableLintBox } from "./lint-framework/lint/box";
	import { onDestroy, onMount, tick } from "svelte";

	interface Props {
		content?: string;
		linters: Linter[];
		onReady?: () => void;
		defaultFontFamily?: EditorFontFamily;
		defaultFontSize?: EditorFontSize;
		onChange?: (text: string) => void;
	}

	let {
		content = "",
		linters,
		onReady = () => null,
		defaultFontFamily = "sans",
		defaultFontSize = "default",
		onChange = () => {}
	}: Props = $props();

	let editor = $state<HTMLDivElement>();
	let quill = $state<Quill>();
	let lintBoxes: IgnorableLintBox[] = $state([]);
	let activeLintId = $state<string | null>(null);
	let documentText = $derived(content);
	let fontFamily = $derived(normalizeFontFamily(defaultFontFamily));
	let fontSize = $derived(normalizeFontSize(defaultFontSize));
	let readySent = $state(false);

	let lfw = $state<LintFramework>();
	let mutationObserver = $state<MutationObserver>();
	let quillTextChangeHandler: (() => void) | null = null;

	function merge<T extends UnpackedLintGroups>(o1: T, o2: T): T {
		return Object.fromEntries(
			Object.keys(o1).map((key) => [
				key,
				["SpellCheck", "Regionalisms"].includes(key)
					? o1[key].filter((x) => o2[key].map((m) => m.context_hash).includes(x.context_hash))
					: [
							...o1[key],
							...o2[key].filter((x) => !o1[key].map((m) => m.context_hash).includes(x.context_hash))
						]
			])
		) as T;
	}

	onMount(async () => {
		lfw = new LintFramework(
			async (text) => {
				const raws = await Promise.all(linters.map((l) => l.organizedLints(text)));

				const groupedByLinters: UnpackedLintGroups[] = await Promise.all(
					raws.map(async (raw, i) => {
						// The framework expects grouped lints keyed by source
						const entries = await Promise.all(
							// Convert internal Harper.js Lint to custom UnpackedLint (avoid depending on external library)
							Object.entries(raw).map(async ([source, lintGroup]: [string, Lint[]]) => {
								const unpacked = await Promise.all(
									lintGroup.map((lint) => unpackLint(text, lint, linters[i]))
								);
								lintGroup.forEach((l) => {
									l.free();
								});

								return [source, unpacked] as const;
							})
						);

						return Object.fromEntries(entries);
					})
				);

				// TODO: Confirm if remove this work
				// scheduleLintBoxSync();

				// TODO: Support more linters
				return merge(groupedByLinters[0], groupedByLinters[1]);
			},
			{
				ignoreLint: async (hash: string) => {
					try {
						if (!lfw) {
							return;
						}

						await Promise.all(linters.map((l) => l.ignoreLintHash(BigInt(hash))));
						console.log(`Ignored ${hash}`);
						// Re-run linting to hide ignored lint immediately
						lfw.update();
						scheduleLintBoxSync();
					} catch (e) {
						console.error("Failed to ignore lint", e);
					}
				},
				getDelay: () => new Promise((resolve) => resolve(250))
			}
		);

		lintBoxes = [];

		try {
			await tick();
			await Promise.all(linters.map((l) => l.setup()));
			await Promise.all(linters.map((l) => l.lint(content)));
		} catch (error) {
			console.error("Failed to initialize linter", error);
		}

		if (editor != null) {
			// lfw.update();

			mutationObserver = new MutationObserver(updateLintFrameworkElements);
			mutationObserver.observe(editor, { childList: true, subtree: true });
			await updateLintFrameworkElements();
		}

		//
		if (linters.every((l) => l != null) && quill != null) {
			if (!readySent) {
				readySent = true;
				onReady();
			}
		}
	});

	onDestroy(() => {
		if (quill != null && quillTextChangeHandler != null) {
			quill.off("text-change", quillTextChangeHandler);
			quillTextChangeHandler = null;
		}

		mutationObserver?.disconnect();
		mutationObserver = undefined;

		lfw?.removeAllEventListeners();
		lfw = undefined;
	});

	async function updateLintFrameworkElements() {
		if (!editor || !lfw) {
			return;
		}

		if (quill == null) {
			let { default: Quill } = await import("quill");
			quill = new Quill(editor, { placeholder: "Start writing..." });
			const container = quill.container ?? quill.root?.parentElement;
			container?.classList.add("harper-editor-quill-container");

			quill.root?.classList.add("harper-editor-surface");
			quill.root?.setAttribute("data-enable-grammarly", "false");
			quill.root?.setAttribute("spellcheck", "false");
			setQuillText(content, false);
			quillTextChangeHandler = () => {
				syncDocumentText(true);
				scheduleLintFrameworkUpdate();
			};
			quill.on("text-change", quillTextChangeHandler);
		}

		for (let el of editor.getElementsByTagName("p")) {
			lfw.addTarget(el);
		}
	}

	// Quill always keeps a trailing document newline; callers expect plain text.
	function normalizeQuillText(text: string): string {
		return text.endsWith("\n") ? text.slice(0, -1) : text;
	}

	function setQuillText(text: string, notify: boolean) {
		if (quill == null) {
			documentText = text;
			return;
		}

		const source = notify ? "user" : "silent";
		quill.setText(text, source);
		syncDocumentText(notify);
	}

	// Keep the public text state and `onChange` callback in sync with Quill's document.
	function syncDocumentText(notify: boolean) {
		if (quill == null) {
			return;
		}

		const next = normalizeQuillText(quill.getText());
		if (next === documentText) {
			return;
		}

		documentText = next;
		if (notify) {
			onChange(next);
		}
	}

	// The lint framework owns highlight DOM, so copy its latest boxes into Svelte state.
	function syncLintBoxes() {
		if (!lfw) {
			return;
		}

		lintBoxes = [...lfw.getLastIgnorableLintBoxes()];
		if (
			activeLintId != null &&
			!lintBoxes.some((lintBox) => lintBox.lint.context_hash === activeLintId)
		) {
			activeLintId = null;
		}
	}

	function scheduleLintBoxSync() {
		requestAnimationFrame(syncLintBoxes);
	}

	// Refresh target elements, ask the framework to lint, then mirror its current boxes.
	function scheduleLintFrameworkUpdate() {
		if (!lfw) {
			return;
		}
		updateLintFrameworkElements();
		lfw.update();
		scheduleLintBoxSync();
	}

	let fontStack = $derived(fontStackFor(fontFamily));
	let editorStyle = $derived(
		`--harper-editor-font-family: ${fontStack};` +
			(fontSize === "default" ? "" : ` --harper-editor-font-size: ${fontSize}px;`)
	);
</script>

<div
	class="harper-editor @container flex w-full flex-1 flex-col overflow-hidden rounded-box bg-base-100 text-base-content"
	style={editorStyle}>
	<div class="flex min-h-0 min-w-0 flex-1">
		<section class="relative flex-1 bg-base-100" aria-label="Document editor">
			<div class="h-full min-w-0 overflow-auto px-8">
				<div class="flex min-h-full">
					<div
						bind:this={editor}
						class="flex min-h-full w-full flex-1 indent-2 [&_p]:mb-2!"
						spellcheck="false">
					</div>
				</div>
			</div>
		</section>
	</div>

	<StatusBar
		text={documentText}
		problemCount={lintBoxes.length}
		{fontFamily}
		{fontSize}
		onFontFamilyChange={(next) => (fontFamily = next)}
		onFontSizeChange={(next) => (fontSize = normalizeFontSize(next))} />
</div>
