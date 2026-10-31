<script lang="ts">
	import { page } from "$app/state";
	import { type EventSourceMessage, EventSourceParserStream } from "eventsource-parser/stream";
	import JSONParser from "@streamparser/json/jsonparser.js";
	import { Info, ListChecks } from "@lucide/svelte";
	import type { Evaluation, EvaluationCriterion } from "#lib/schemas/evaluation.ts";
	import type { PracticeSessionContext } from "#lib/schemas/task-context.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import { type EvaluateRequest, evaluateRequestSchema } from "#lib/schemas/evaluate-request.ts";
	import { bandToProgressValue, bandTone, minWordsFor } from "#lib/utils/ielts.ts";
	import { countWords } from "#lib/utils/stats.ts";
	import type { Criteria } from "#lib/schemas/criteria.ts";
	import { CRITERIA_MAP, CRITERION_CHECK_STATUS_MAP } from "#lib/mappings/criteria.ts";
	import { getZodErrors } from "#lib/utils/error.ts";
	import ValidationErrors from "#lib/components/ValidationErrors.svelte";
	import type { ApiResult } from "#lib/schemas/api-result.ts";
	import { isCriteriaKey } from "./utils";
	import { saveEvaluation } from "./save-evaluation.remote";

	type Props = {
		practiceSessionId: string;
		practiceSessionContext: PracticeSessionContext;
		evaluation: Evaluation | undefined;
		isBusy: boolean;
	};

	let { evaluation = $bindable(), isBusy = $bindable(false), ...props }: Props = $props();

	let abortController = $state<AbortController>(new AbortController());

	const estimatedBand = $derived(evaluation?.estimatedBand);
	const criteriaList = $derived<{ key: Criteria; criterion: EvaluationCriterion }[]>(
		evaluation ? getCriteriaOf(evaluation) : []
	);
	const minWords = $derived(minWordsFor(props.practiceSessionContext.category));
	const wordCount = $derived(countWords(props.practiceSessionContext.response));
	const readiness = $derived.by(() => {
		const items = [
			{
				label: `Write at least ${minWords} words`,
				done: wordCount >= minWords,
				hint: `${wordCount} / ${minWords}`
			}
		];

		if (props.practiceSessionContext.category === "1") {
			items.push({
				label: "Attach the task image",
				done: Boolean(props.practiceSessionContext.image),
				hint: props.practiceSessionContext.image ? "Attached" : "Required"
			});
		}

		return items;
	});

	function getCriteriaOf(current: Evaluation): { key: Criteria; criterion: EvaluationCriterion }[] {
		const { coherenceAndCohesion, lexicalResource, grammaticalRangeAndAccuracy } = current.criteria;

		if (current.taskCategory === "1") {
			return [
				{ key: "taskAchievement", criterion: current.criteria.taskAchievement },
				{ key: "coherenceAndCohesion", criterion: coherenceAndCohesion },
				{ key: "lexicalResource", criterion: lexicalResource },
				{ key: "grammaticalRangeAndAccuracy", criterion: grammaticalRangeAndAccuracy }
			];
		}

		return [
			{ key: "taskResponse", criterion: current.criteria.taskResponse },
			{ key: "coherenceAndCohesion", criterion: coherenceAndCohesion },
			{ key: "lexicalResource", criterion: lexicalResource },
			{ key: "grammaticalRangeAndAccuracy", criterion: grammaticalRangeAndAccuracy }
		];
	}

	function createEmptyEvaluation(category: "1" | "2"): Evaluation {
		const common = {
			summary: "",
			estimatedBand: 0
		};

		const emptyCriterion = {
			band: 0,
			checks: [],
			strengths: [],
			weaknesses: [],
			why: "",
			nextBandGap: ""
		} satisfies EvaluationCriterion;

		if (category === "1") {
			return {
				...common,
				taskCategory: "1",
				criteria: {
					taskAchievement: { ...emptyCriterion },
					coherenceAndCohesion: { ...emptyCriterion },
					lexicalResource: { ...emptyCriterion },
					grammaticalRangeAndAccuracy: { ...emptyCriterion }
				}
			};
		}

		return {
			...common,
			taskCategory: "2",
			criteria: {
				taskResponse: { ...emptyCriterion },
				coherenceAndCohesion: { ...emptyCriterion },
				lexicalResource: { ...emptyCriterion },
				grammaticalRangeAndAccuracy: { ...emptyCriterion }
			}
		};
	}

	function assignCriterion(target: Evaluation, key: Criteria, criterion: EvaluationCriterion) {
		if (target.taskCategory === "1" && key !== "taskResponse") {
			target.criteria[key] = criterion;
		} else if (target.taskCategory === "2" && key !== "taskAchievement") {
			target.criteria[key] = criterion;
		}
	}

	async function handleEvaluate() {
		try {
			if (isBusy) {
				abortController.abort();
				abortController = new AbortController();
				return;
			}

			const request = buildEvaluateRequest(props.practiceSessionContext);
			if (!request) return;

			const result = evaluateRequestSchema.safeParse(request);
			if (!result.success) {
				const errors = getZodErrors(result.error);
				return openModal({
					title: "Validation Error",
					content: {
						component: ValidationErrors,
						props: { errors: errors }
					},
					primaryButton: "Close"
				});
			}

			isBusy = true;
			evaluation = createEmptyEvaluation(props.practiceSessionContext.category);

			const response = await fetch(`${page.url.pathname}/evaluate`, {
				body: JSON.stringify(result.data),
				credentials: "include",
				method: "POST",
				signal: abortController.signal
			});

			if (!response.ok) {
				const apiResult = await response.json<ApiResult>();
				if (!apiResult.success && apiResult.error.type === "validation") {
					return openModal({
						title: "Unable to evaluate",
						content: {
							component: ValidationErrors,
							props: { errors: apiResult.error.fields }
						},
						primaryButton: "Close"
					});
				}
			}

			const stream = response.body;
			if (!stream) {
				return openModal({
					title: "Unable to evaluate",
					content: "Cannot read response body",
					primaryButton: "Close"
				});
			}

			const parser = new JSONParser({ paths: ["$", "$.*", "$.criteria.*"] });
			parser.onValue = ({ key, stack, value }) => {
				const current = evaluation;
				if (!current || !value) {
					return;
				}

				if (stack.length === 1 && key === "summary") {
					current.summary = value as Evaluation["summary"];
				} else if (stack.length === 1 && key === "estimatedBand") {
					current.estimatedBand = value as Evaluation["estimatedBand"];
				} else if (stack.length === 2 && stack[1]?.key === "criteria" && isCriteriaKey(key)) {
					assignCriterion(current, key, value as EvaluationCriterion);
				}
			};

			const reader = stream
				.pipeThrough(new TextDecoderStream())
				.pipeThrough(new EventSourceParserStream())
				.pipeThrough(
					new TransformStream<EventSourceMessage>({
						transform(chunk, controller) {
							if (chunk.data === "[DONE]") {
								return;
							}

							try {
								const json = JSON.parse(chunk.data);
								// TODO: Make this into openapi-compatible structured json
								const content = json.choices?.[0]?.delta?.content;
								if (content) {
									controller.enqueue(content);
								}
							} catch {
								// Ignore non-JSON control signals or ping events
							}
						}
					})
				)
				.getReader();
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}
				parser.write(value);
			}
		} catch (e) {
			openModal({
				content: String(e),
				primaryButton: "Close",
				title: "Unable to evaluate"
			});
			evaluation = undefined;
		} finally {
			isBusy = false;
			if (evaluation) {
				await saveEvaluation({ practiceSessionId: props.practiceSessionId, evaluation });
			}
		}
	}

	function buildEvaluateRequest(context: PracticeSessionContext): EvaluateRequest | undefined {
		if (context.category === "1") {
			if (!context.imageName) {
				openModal({
					title: "Validation failed",
					content: "Please add a task image.",
					primaryButton: "Close"
				});

				return;
			}

			return {
				task: {
					category: "1",
					imageName: context.imageName,
					prompt: context.prompt
				},
				practiceSession: { response: context.response }
			};
		}

		return {
			task: { category: "2", prompt: context.prompt },
			practiceSession: { response: context.response }
		};
	}
</script>

<div class={["h-full w-full rounded-box", isBusy && "aura aura-holo"]}>
	<div class="flex h-full w-full flex-col gap-2 rounded-box bg-base-100">
		<div class="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
			{#if evaluation === undefined}
				<div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
					<ListChecks class="size-6" />
					<div>
						<p class="font-semibold">Get your band score</p>
						<p class="mt-0.5 text-xs text-base-content/75">
							The AI examiner scores all four criteria and explains every mark.
						</p>
					</div>

					<ul class="flex w-full max-w-xs flex-col gap-1.5 text-left">
						{#each readiness as item (item.label)}
							<li
								class="flex items-center justify-between gap-2 rounded-box border border-base-content/10 px-2.5 py-1.5 text-xs">
								<span class="flex items-center gap-2">
									<span class={["status", item.done ? "status-success" : "status-warning"]}></span>
									<span class={item.done ? "text-base-content/60" : "font-medium"}>
										{item.label}
									</span>
								</span>
								<span class="shrink-0 text-[10px] text-base-content/50 tabular-nums">
									{item.hint}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<div
					class={[
						"flex gap-3 border-b border-b-base-content/20 bg-base-100 pb-3",
						!estimatedBand && "items-center"
					]}>
					{#if estimatedBand}
						<div
							class={["radial-progress text-3xl font-bold", bandTone(estimatedBand)]}
							style:--value={bandToProgressValue(estimatedBand)}
							role="progressbar"
							aria-label="Estimated band"
							aria-valuenow={estimatedBand}
							aria-valuemin={0}
							aria-valuemax={9}>
							{estimatedBand.toFixed(1)}
						</div>
						<div class="min-w-0">
							<p class="truncate text-sm font-semibold">AI Evaluator</p>
							<p class="text-xs text-base-content/75">{evaluation.summary}</p>
							<p class="mt-2 flex items-center gap-1 text-xs text-base-content/60">
								<Info class="size-3" />
								AI can make mistakes so double-check responses.
							</p>
						</div>
					{:else}
						<div class="loading w-20 loading-ring text-primary"></div>
						<p class="animate-pulse text-sm">Estimating your band...</p>
					{/if}
				</div>

				{#each criteriaList as { key, criterion } (key)}
					<details class="collapse-arrow collapse bg-base-100">
						<summary class="collapse-title cursor-pointer p-0">
							<span class="font-semibold">
								{CRITERIA_MAP[key]}
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
															{CRITERION_CHECK_STATUS_MAP[check.status]}
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
			{/if}
		</div>

		<div class="flex items-center gap-2 p-3">
			<button class="group btn flex-1 btn-primary" onclick={handleEvaluate} disabled={isBusy}>
				<span class="loading loading-infinity not-group-disabled:hidden"></span>
				{#if isBusy}
					Evaluating...
				{:else if evaluation}
					Re-evaluate
				{:else}
					Evaluate my response
				{/if}
			</button>
		</div>
	</div>
</div>
