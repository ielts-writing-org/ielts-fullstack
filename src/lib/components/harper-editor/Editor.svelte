<script lang="ts">
	import type { Lint, Linter } from "harper.js";
	import type Quill from "quill";
	import { type EditorFontFamily, fontStackFor, normalizeFontFamily } from "./editor-display";
	import LintFramework from "./lint-framework/lint-framework";
	import type { UnpackedLintGroups } from "./lint-framework/unpack-lint";
	import unpackLint from "./lint-framework/unpack-lint";
	import StatusBar from "./StatusBar.svelte";
	import type { IgnorableLintBox } from "./lint-framework/box";
	import { onDestroy, onMount, untrack } from "svelte";

	interface Props {
		name?: string;
		content?: string;
		linters: Linter[];
		defaultFontFamily?: EditorFontFamily;
		isEditable?: boolean;
		wordTarget?: number;
		placeholder?: string;
		saveState?: "unsaved" | "saving" | "saved" | "failed";
		onChange?: (text: string) => void;
		onReady?: () => void;
		onRetrySave?: () => void;
	}

	let {
		name,
		linters,
		content = "",
		defaultFontFamily = "serif",
		isEditable = true,
		wordTarget = 0,
		placeholder = "Start writing...",
		saveState,
		onChange,
		onReady,
		onRetrySave
	}: Props = $props();

	let editor = $state<HTMLDivElement>();
	let quill = $state<Quill>();
	let lintBoxes = $state<IgnorableLintBox[]>([]);
	let documentText = $derived<string>(content);
	let fontFamily = $derived<EditorFontFamily>(defaultFontFamily);

	let lfw = $state<LintFramework>();
	let quillTextChangeHandler: (() => void) | null = null;

	async function updateLintFrameworkElements() {
		if (!editor || !lfw) {
			return;
		}

		for (let el of editor.getElementsByTagName("p")) {
			lfw.addTarget(el);
		}

		lfw.update();
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
			onChange?.(next);
		}
	}

	function scheduleLintFrameworkUpdate() {
		requestAnimationFrame(updateLintFrameworkElements);
	}

	function getEditorName() {
		return name ? name : "default";
	}

	function loadFontFamily() {
		const savedFontFamily = localStorage.getItem(`font-family-${getEditorName()}`);
		if (savedFontFamily) {
			fontFamily = normalizeFontFamily(savedFontFamily);
		}
	}

	onMount(async () => {
		lfw = new LintFramework(
			async (text) => {
				function merge(o1: UnpackedLintGroups, o2: UnpackedLintGroups): UnpackedLintGroups {
					return Object.fromEntries(
						Object.keys(o1).map((key) => [
							key,
							["SpellCheck", "Regionalisms"].includes(key)
								? o1[key].filter((x) => o2[key].map((m) => m.context_hash).includes(x.context_hash))
								: [
										...o1[key],
										...o2[key].filter(
											(x) => !o1[key].map((m) => m.context_hash).includes(x.context_hash)
										)
									]
						])
					);
				}

				const raws = await Promise.all(linters.map((l) => l.organizedLints(text)));

				const groupedByLinters: UnpackedLintGroups[] = await Promise.all(
					raws.map(async (raw, i) => {
						// The framework expects grouped lints keyed by source
						const entries = await Promise.all(
							Object.entries(raw).map(async ([source, lintGroup]: [string, Lint[]]) => {
								const unpacked = await Promise.all(
									lintGroup.map((lint) => unpackLint(text, lint, linters[i]))
								);
								lintGroup.forEach((l) => l.free());

								return [source, unpacked];
							})
						);

						return Object.fromEntries(entries);
					})
				);

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

						lfw.update();
					} catch (e) {
						console.error("Failed to ignore lint", e);
					}
				},
				afterLinting: (value) => {
					lintBoxes = value;
				},
				getDelay: async () => 150
			}
		);

		if (editor && !quill) {
			let { default: Quill } = await import("quill");
			quill = new Quill(editor, { placeholder });
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

			loadFontFamily();
			onReady?.();
		}

		if (linters.length > 0) {
			scheduleLintFrameworkUpdate();
		}
	});

	onDestroy(() => {
		if (quill != null && quillTextChangeHandler != null) {
			quill.off("text-change", quillTextChangeHandler);
			quillTextChangeHandler = null;
		}

		if (lfw) {
			lfw.removeAllEventListeners();
			lfw = undefined;
		}
	});

	$effect(() => {
		if (isEditable) {
			untrack(() => quill)?.enable();
		} else {
			untrack(() => quill)?.disable();
		}

		if (linters.length > 0) {
			scheduleLintFrameworkUpdate();
		}
	});
</script>

<div
	class="harper-editor @container flex w-full flex-1 flex-col overflow-hidden rounded-box bg-base-100 text-base-content"
	style:--harper-editor-font-family={fontStackFor(fontFamily)}>
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
		{wordTarget}
		{saveState}
		{onRetrySave}
		onFontFamilyChange={(value) => {
			fontFamily = value;
			localStorage.setItem(`font-family-${getEditorName()}`, value);
		}} />
</div>
