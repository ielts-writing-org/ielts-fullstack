<script lang="ts">
	import { Minus, Pencil, Target, TrendingDown, TrendingUp } from "@lucide/svelte";
	import { roundToNearestHalf } from "#lib/utils/math.ts";
	import { bandTone, bandToProgressValue } from "#lib/utils/ielts.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import ChangeBandTarget from "../ChangeBandTarget.svelte";

	type Props = {
		statistics: {
			criteria: {
				name: string;
				task1: number;
				task2: number;
			}[];
			estimatedBand: number;
		};

		bandTarget: number;
		/** Overall bands of the most recent evaluated sessions, oldest first. */
		trend: number[];
		evaluatedCount: number;
	};

	const props: Props = $props();

	const overall = $derived(roundToNearestHalf(props.statistics.estimatedBand));
	const hasEvaluations = $derived(props.evaluatedCount > 0);
	const targetGap = $derived(props.bandTarget - props.statistics.estimatedBand);

	function openTargetModal() {
		openModal({
			title: "Change target band",
			content: { component: ChangeBandTarget, props: { bandTarget: props.bandTarget } }
		});
	}

	const trendSummary = $derived.by(() => {
		const bands = props.trend;
		if (bands.length < 2) {
			return null;
		}

		const half = Math.floor(bands.length / 2);
		const older = bands.slice(0, half).reduce((sum, band) => sum + band, 0) / half;
		const recent =
			bands.slice(half).reduce((sum, band) => sum + band, 0) / (bands.length - half);
		const difference = recent - older;

		if (difference >= 0.25) {
			return { icon: TrendingUp, label: "Improving", tone: "text-success" };
		}
		if (difference <= -0.25) {
			return { icon: TrendingDown, label: "Declining", tone: "text-error" };
		}
		return { icon: Minus, label: "Steady", tone: "text-base-content/75" };
	});

	const trendPath = $derived.by(() => {
		const bands = props.trend;
		if (bands.length < 2) {
			return "";
		}

		const stepX = 96 / (bands.length - 1);
		return bands
			.map((band, i) => {
				const x = 2 + i * stepX;
				const clamped = Math.max(0, Math.min(9, band));
				const y = 26 - (clamped / 9) * 22;
				return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join(" ");
	});
</script>

<aside
	class="flex flex-col gap-3 overflow-hidden rounded-box border border-base-content/20 bg-base-100 p-4 hover:border-primary"
	aria-label="Progress">
	<div>
		<h2 class="font-bold">Progress</h2>
		<p class="text-xs whitespace-nowrap text-base-content/75">Average band across evaluated sessions</p>
	</div>

	{#if !hasEvaluations}
		<div
			class="flex flex-1 flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-content/20 py-8 text-center text-base-content/75">
			<Target class="size-8 opacity-60" />
			<p class="text-sm font-semibold">No evaluations yet</p>
			<p class="max-w-60 text-xs">
				Write a response and run Evaluate to unlock your band breakdown and track your progress.
			</p>
		</div>
	{:else}
		<div class="flex items-center gap-4">
			<div class="flex flex-col items-center">
				<div
					class={["radial-progress font-bold", bandTone(overall)]}
					style:--value={bandToProgressValue(overall)}
					style:--size="4.75em"
					role="progressbar"
					aria-label="Overall average band"
					aria-valuenow={overall}
					aria-valuemin={0}
					aria-valuemax={9}>
					{overall.toFixed(1)}
				</div>
				<span class="mt-1 text-xs text-base-content/75">Overall</span>
			</div>

			<div class="flex min-w-0 flex-1 flex-col gap-2">
				{#if props.bandTarget > 0}
					<div class="flex items-center gap-1.5">
						<Target class="size-4 shrink-0 text-primary" />
						<span class="text-sm font-semibold">Target {props.bandTarget.toFixed(1)}</span>
						<button
							class="btn btn-circle btn-ghost btn-xs"
							aria-label="Change target band"
							onclick={openTargetModal}>
							<Pencil class="size-3.5" />
						</button>
					</div>
					{#if overall >= props.bandTarget}
						<span class="badge badge-sm self-start font-semibold badge-success">Target reached</span>
					{:else}
						<p class="text-xs text-base-content/75">{targetGap.toFixed(1)} band away from your target</p>
					{/if}
				{:else}
					<p class="text-xs text-base-content/75">No target set yet</p>
					<button class="btn btn-outline btn-primary btn-xs self-start" onclick={openTargetModal}>
						<Target class="size-3.5" />
						Set target band
					</button>
				{/if}

				{#if trendSummary}
					<div class="mt-0.5 border-t border-base-content/10 pt-2">
						<div class="flex items-center gap-1.5 text-xs">
							<trendSummary.icon class={["size-3.5 shrink-0", trendSummary.tone]} />
							<span class="font-semibold">{trendSummary.label}</span>
							<span class="text-base-content/75">· last {props.trend.length} evaluations</span>
						</div>
						<svg
							class="mt-1 h-7 w-full text-primary"
							viewBox="0 0 100 28"
							preserveAspectRatio="none"
							role="img"
							aria-label="Band scores of your last {props.trend.length} evaluations, oldest to newest">
							<path
								d={trendPath}
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								vector-effect="non-scaling-stroke" />
						</svg>
					</div>
				{/if}
			</div>
		</div>

		<div
			class="flex flex-col gap-2 border-t border-base-content/10 pt-3"
			title="Task 2 bands are weighted double, matching the IELTS overall writing band calculation">
			{#each props.statistics.criteria as criterion (criterion.name)}
				<div class="flex gap-4">
					<div class="flex-1">
						{const criterionAvg = (criterion.task1 * 1) / 3 + (criterion.task2 * 2) / 3}
						<div class="text-sm font-semibold">{criterion.name}</div>
						<div class="flex items-center gap-2">
							<div
								class={[
									"text-sm font-medium",
									criterionAvg >= 7.5 && "text-success",
									criterionAvg >= 5.5 && criterionAvg < 7.5 && "text-warning",
									criterionAvg < 5.5 && "text-error"
								]}>
								{roundToNearestHalf(criterionAvg).toFixed(1)}
							</div>
							<progress
								class={[
									"progress",
									criterionAvg >= 7.5 && "progress-success",
									criterionAvg >= 5.5 && criterionAvg < 7.5 && "progress-warning",
									criterionAvg < 5.5 && "progress-error"
								]}
								value={criterionAvg}
								max="9">
							</progress>
						</div>
					</div>
					<div class="flex justify-end gap-4">
						{@render taskBandSnippet("1", criterion.task1)}
						{@render taskBandSnippet("2", criterion.task2)}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</aside>

{#snippet taskBandSnippet(taskCategory: string, taskAvg: number)}
	<div
		class="tooltip tooltip-left"
		data-tip={`Average task ${taskCategory} band: ${roundToNearestHalf(taskAvg).toFixed(1)}`}>
		<div class="flex flex-col items-center">
			<div
				class={[
					"radial-progress",
					taskAvg >= 7.5 && "text-success",
					taskAvg >= 5.5 && taskAvg < 7.5 && "text-warning",
					taskAvg < 5.5 && "text-error"
				]}
				style:--value={(taskAvg / 9) * 100}
				style:--size="2em"
				aria-valuenow={taskAvg}
				role="progressbar">
				{roundToNearestHalf(taskAvg).toFixed(1)}
			</div>
			<div class="text-xs">Task {taskCategory}</div>
		</div>
	</div>
{/snippet}
