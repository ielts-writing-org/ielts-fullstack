<script lang="ts">
	import { MessagesSquare } from "@lucide/svelte";
	import type { Evaluation } from "#lib/domain/evaluation.ts";
	import type { Criteria } from "#lib/domain/criteria.ts";
	import { CRITERIA_LABELS, CRITERION_CHECK_STATUS_LABELS } from "#lib/domain/criteria.ts";

	type Props = {
		evaluation: Evaluation;
		isBusy: boolean;
		/** Key of the criterion detail that should be expanded. */
		openCriterionKey: Criteria | null;
		/** Asks the tutor panel to open with a prefilled question. */
		onAskTutor: (question: string) => void;
	};

	let { evaluation, isBusy, openCriterionKey, onAskTutor }: Props = $props();

	const criteriaList = $derived.by(() => {
		const { coherenceAndCohesion, lexicalResource, grammaticalRangeAndAccuracy } =
			evaluation.criteria;

		if (evaluation.taskCategory === "1") {
			return [
				{ key: "taskAchievement" as Criteria, criterion: evaluation.criteria.taskAchievement },
				{ key: "coherenceAndCohesion" as Criteria, criterion: coherenceAndCohesion },
				{ key: "lexicalResource" as Criteria, criterion: lexicalResource },
				{ key: "grammaticalRangeAndAccuracy" as Criteria, criterion: grammaticalRangeAndAccuracy }
			];
		}

		return [
			{ key: "taskResponse" as Criteria, criterion: evaluation.criteria.taskResponse },
			{ key: "coherenceAndCohesion" as Criteria, criterion: coherenceAndCohesion },
			{ key: "lexicalResource" as Criteria, criterion: lexicalResource },
			{ key: "grammaticalRangeAndAccuracy" as Criteria, criterion: grammaticalRangeAndAccuracy }
		];
	});
</script>

{#each criteriaList as { key, criterion } (key)}
	<details class="collapse-arrow collapse bg-base-100" open={openCriterionKey === key}>
		<summary class="collapse-title cursor-pointer p-0">
			<span class="font-semibold">
				{CRITERIA_LABELS[key]}
			</span>

			{#if criterion.band}
				<div class="flex items-center gap-2">
					<div
						class={[
							criterion.band >= 7.5 && "text-success",
							criterion.band >= 5.5 && criterion.band < 7.5 && "text-warning",
							criterion.band < 5.5 && "text-error"
						]}>
						{criterion.band.toPrecision(2)}
					</div>
					<progress
						class={[
							"progress w-[80%]",
							criterion.band >= 7.5 && "progress-success",
							criterion.band >= 5.5 && criterion.band < 7.5 && "progress-warning",
							criterion.band < 5.5 && "progress-error"
						]}
						value={criterion.band}
						max={9}>
					</progress>
				</div>
			{:else if isBusy}
				<div class="animate-pulse text-base-content/75">Analyzing...</div>
			{/if}
		</summary>

		{#if criterion.why}
			<div class="collapse-content text-sm">
				<p class="text-base-content/75">
					<span class="font-semibold">Summary:</span>
					{criterion.why}
				</p>
				<p class="text-base-content/75">
					<span class="font-semibold">Advice:</span>
					{criterion.nextBandGap}
				</p>
				<button
					type="button"
					class="btn mt-1 self-start btn-ghost text-primary btn-xs"
					onclick={() =>
						onAskTutor(
							`How can I improve my ${CRITERIA_LABELS[key]} band? The evaluation says: "${criterion.nextBandGap}"`
						)}>
					<MessagesSquare class="size-3.5" />
					Ask the tutor how to get there
				</button>

				{const checks = $state(criterion.checks)}
				{#if checks && checks.length > 0}
					<p class="mt-2 font-semibold text-base-content/75">Checks:</p>
					<ul class="list list-decimal pl-6">
						{#each checks as check (check.title)}
							<li class="py-1">
								<details class="collapse">
									<summary
										class="collapse-title flex cursor-pointer flex-col justify-between p-0 sm:flex-row">
										<span>{check.title}</span>
										<span
											class={[
												"badge badge-sm",
												check.status === "met" && "badge-success",
												check.status === "partially_met" && "badge-warning",
												check.status === "not_met" && "badge-error"
											]}>
											{CRITERION_CHECK_STATUS_LABELS[check.status]}
										</span>
									</summary>
									<div class="collapse-content p-0 text-base-content/75">
										{check.evidence}
									</div>
								</details>
							</li>
						{/each}
					</ul>
				{/if}

				{const strengths = $state(criterion.strengths)}
				{#if strengths}
					<div class="mt-2 text-base-content/75">
						<p class="font-semibold">Strengths:</p>
						<ul class="list list-decimal pl-6">
							{#each strengths as strength (strength.title)}
								<li class="py-1">
									<details class="collapse">
										<summary
											class="collapse-title flex cursor-pointer flex-col justify-between p-0 sm:flex-row">
											<span>{strength.title}</span>
										</summary>
										<div class="collapse-content p-0 text-base-content/75">
											{strength.evidence}
										</div>
									</details>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{const weaknesses = $state(criterion.weaknesses)}
				{#if weaknesses.length}
					<div class="mt-2 text-base-content/75">
						<p class="font-semibold">Weaknesses:</p>
						<ul class="list list-decimal pl-6">
							{#each weaknesses as weakness (weakness.title)}
								<li class="py-1">
									<details class="collapse">
										<summary
											class="collapse-title flex cursor-pointer flex-col justify-between p-0 sm:flex-row">
											<span>{weakness.title}</span>
										</summary>
										<div class="collapse-content p-0 text-base-content/75">
											<div>
												<span class="font-semibold">Evidence:</span>
												{weakness.evidence}
											</div>
											<div>
												<span class="font-semibold">Advice:</span>
												{weakness.advice}
											</div>
											<button
												type="button"
												class="btn mt-1 btn-ghost text-primary btn-xs"
												onclick={() =>
													onAskTutor(
														`How can I fix this weakness in ${CRITERIA_LABELS[key]}? The weakness is "${weakness.title}" — evidence in my writing: ${weakness.evidence}`
													)}>
												<MessagesSquare class="size-3.5" />
												Ask the tutor about this
											</button>
										</div>
									</details>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}
	</details>
{/each}
