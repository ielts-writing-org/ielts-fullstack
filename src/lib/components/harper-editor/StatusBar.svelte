<script lang="ts">
	import { countCharacters, countWords } from "#lib/utils/stats.ts";
	import {
		type EditorFontFamily,
		type EditorFontSize,
		FONT_OPTIONS,
		FONT_SIZES
	} from "./editor-display.ts";

	interface Props {
		text?: string;
		problemCount?: number;
		fontFamily?: EditorFontFamily;
		fontSize?: EditorFontSize;
		onFontFamilyChange?: (fontFamily: EditorFontFamily) => void;
		onFontSizeChange?: (fontSize: EditorFontSize) => void;
	}

	let {
		text = "",
		problemCount = 0,
		fontFamily = "sans",
		fontSize = "default",
		onFontFamilyChange = () => {},
		onFontSizeChange = () => {}
	}: Props = $props();

	const words = $derived(countWords(text));
	const chars = $derived(countCharacters(text));
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

	<span class="hidden h-2.5 w-px bg-base-content/20 @md:inline"></span>

	<span class="@md:hidden">{words}w</span>
	<span class="hidden @md:inline">{words} words</span>
	<span class="@md:hidden">{chars}c</span>
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

	<label
		class="relative inline-flex h-4.5 items-center rounded-selector border-[0.5px] border-base-content/10 bg-base-200 pr-4.5 pl-2 text-[11px] font-medium text-base-content after:absolute after:top-1/2 after:right-1.25 after:-translate-y-1/2 after:cursor-pointer after:font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text',sans-serif] after:text-[9px] after:leading-none after:text-stone-500 after:content-['v']">
		<span>{fontSize === "default" ? "Default" : `${fontSize}px`}</span>
		<select
			value={fontSize}
			class="absolute inset-0 cursor-pointer border-0 bg-base-300 opacity-0"
			aria-label="Font size"
			onchange={(event) => {
				const value = event.currentTarget.value;
				onFontSizeChange(value === "default" ? "default" : Number(value));
			}}>
			<option value="default">Default</option>
			{#each FONT_SIZES as size (size)}
				<option value={size}>{size}px</option>
			{/each}
		</select>
	</label>
</footer>
