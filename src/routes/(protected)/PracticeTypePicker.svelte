<script lang="ts">
	import { AlarmClock, AlarmClockOff, Check } from "@lucide/svelte";
	import type { TaskCategory } from "#lib/schemas/task-category.ts";
	import type { PracticeSessionType } from "#lib/schemas/practice-session-type.ts";

	type Props = {
		category: TaskCategory;
		value?: PracticeSessionType;
		class?: string;
	};

	let { category, value = $bindable("timed"), class: className }: Props = $props();

	const options = $derived([
		{
			value: "timed" as const,
			icon: AlarmClock,
			title: `Timed — ${category === "1" ? 20 : 40} minutes`,
			description: "Exam conditions. The timer starts with the editor and warns you at the end."
		},
		{
			value: "free" as const,
			icon: AlarmClockOff,
			title: "Free practice",
			description: "No timer. Take as long as you need and save as you go."
		}
	]);
</script>

<div
	class={["grid gap-2 sm:grid-cols-2", className]}
	role="radiogroup"
	aria-label="Practice type">
	{#each options as option (option.value)}
		<label
			class={[
				"flex cursor-pointer items-start gap-2.5 rounded-box border p-3 transition-colors",
				"hover:border-primary",
				value === option.value ? "border-primary bg-primary/5" : "border-base-content/20"
			]}>
			<input
				class="sr-only"
				type="radio"
				name="practice-type"
				checked={value === option.value}
				onchange={() => (value = option.value)} />
			<option.icon
				class={[
					"mt-0.5 size-5 shrink-0",
					value === option.value ? "text-primary" : "text-base-content/60"
				]} />
			<span class="min-w-0 flex-1">
				<span class="block text-sm font-semibold">{option.title}</span>
				<span class="mt-0.5 block text-xs text-base-content/75">{option.description}</span>
			</span>
			<span
				class={["grid size-5 shrink-0 place-items-center rounded-full border", value === option.value ? "border-primary bg-primary text-primary-content" : "border-base-content/20 text-transparent"]}>
				<Check class="size-3.5" />
			</span>
		</label>
	{/each}
</div>
