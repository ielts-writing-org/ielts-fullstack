<script lang="ts">
	import { countCharacters, countWords } from "#lib/utils/stats.ts";
	import { Check, RotateCcw, TriangleAlert } from "@lucide/svelte";
	import { type EditorFontFamily, FONT_OPTIONS } from "./editor-display.ts";

	type SaveState = "unsaved" | "saving" | "saved" | "failed";

	interface Props {
		text?: string;
		problemCount?: number;
		fontFamily?: EditorFontFamily;
		/** Minimum acceptable word count (IELTS task requirement). */
		wordTarget?: number;
		/** Document save state; rendered with a Retry action when it failed. */
		saveState?: SaveState;
		/** Retries the save after a failure. */
		onRetrySave?: () => void;
		onFontFamilyChange?: (fontFamily: EditorFontFamily) => void;
	}

	let {
		text = "",
		problemCount = 0,
		fontFamily = "sans",
		wordTarget = 0,
		saveState,
		onRetrySave = () => {},
		onFontFamilyChange = () => {}
	}: Props = $props();

	const words = $derived(countWords(text));
	const chars = $derived(countCharacters(text));
	const hasTarget = $derived(wordTarget > 0);
	const goalMet = $derived(hasTarget && words >= wordTarget);
	const goalProgress = $derived(
		hasTarget ? Math.min(100, Math.round((words / wordTarget) * 100)) : 0
	);

	const saveLabels: Record<SaveState, string> = {
		unsaved: "Not saved",
		saving: "Saving",
		saved: "Saved",
		failed: "Save failed"
	};
</script>

<footer
	class="flex min-h-6.5 flex-[0_0_auto] items-center gap-3.5 overflow-x-auto rounded-br-box border-t-[0.5px] border-r-[0.5px] border-base-content/20 bg-base-300 px-2 pr-2 pl-3.5 font-mono text-[11px] text-base-content tabular-nums"
	aria-label="Editor status">
	<div class="inline-flex items-center gap-2">
		<span class="inline-flex items-center gap-1.5">
			<span class={["status", problemCount === 0 ? "status-success" : "status-error"]}></span>
			{#if problemCount === 0}
				<span class="@md:hidden">Clear</span>
				<span class="hidden @md:inline">All clear</span>
			{:else}
				{problemCount} problem{problemCount === 1 ? "" : "s"}
			{/if}
		</span>
	</div>

	{#if saveState}
		<span class="inline-flex items-center gap-1.5">
			<span
				class={[
					"status",
					saveState === "saved" && "status-success",
					saveState === "saving" && "animate-bounce status-warning",
					(saveState === "unsaved" || saveState === "failed") && "status-error"
				]}></span>
			<span
				class={[
					saveState === "saved" && "text-success",
					saveState === "saving" && "text-warning",
					(saveState === "unsaved" || saveState === "failed") && "text-error"
				]}>
				{saveLabels[saveState]}
			</span>
			{#if saveState === "failed"}
				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1 px-1 text-error"
					title="Try saving again"
					onclick={onRetrySave}>
					<RotateCcw class="size-3" />
					Retry
				</button>
			{/if}
		</span>
	{/if}

	<span class="hidden h-2.5 w-px bg-base-content/20 @md:inline"></span>

	{#if hasTarget}
		<span
			class={["inline-flex items-center gap-1.5", goalMet ? "text-success" : "text-warning"]}
			title={goalMet
				? `Minimum of ${wordTarget} words met`
				: `${wordTarget - words} more words to reach the minimum`}>
			{#if goalMet}
				<Check class="size-3" />
			{:else}
				<TriangleAlert class="size-3" />
			{/if}
			<span class="@md:hidden">{words}/{wordTarget}w</span>
			<span class="hidden @md:inline">{words} / {wordTarget} words</span>
			<progress
				class={[
					"progress hidden w-16 @md:block",
					goalMet ? "progress-success" : "progress-warning"
				]}
				value={goalProgress}
				max="100"
				aria-label="Minimum word count progress">
			</progress>
		</span>
	{:else}
		<span class="@md:hidden">{words}w</span>
		<span class="hidden @md:inline">{words} words</span>
	{/if}

	<span class={["@md:hidden", hasTarget && "hidden"]}>{chars}c</span>
	<span class="hidden @md:inline">{chars} chars</span>

	<span class="flex-1"></span>

	<div
		class="inline-flex h-4.5 items-center rounded-selector border-[0.5px] border-base-content/10 bg-base-200"
		aria-label="Font family">
		{#each FONT_OPTIONS as option (option.label)}
			<button
				type="button"
				class={[
					"inline-flex h-4 min-w-7 cursor-pointer items-center justify-center rounded-selector px-2 text-xs leading-none font-medium ",
					fontFamily === option.value && "bg-primary/10 font-bold text-primary shadow-sm "
				]}
				style:font-family={option.stack}
				title={option.label}
				aria-label={`Use ${option.label.toLowerCase()} font`}
				aria-pressed={fontFamily === option.value}
				onclick={() => onFontFamilyChange(option.value)}>
				{option.sample}
			</button>
		{/each}
	</div>
</footer>
