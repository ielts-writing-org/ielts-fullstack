<script lang="ts">
	import { page } from "$app/state";
	import JSONParser from "@streamparser/json/jsonparser.js";
	import { Info, ListChecks } from "@lucide/svelte";
	import type { Evaluation, EvaluationCriterion } from "#lib/domain/evaluation.ts";
	import type { PracticeSessionContext } from "#lib/domain/task-context.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import { convertBandToProgressValue } from "#lib/utils/ielts.ts";
	import { getResponseAcceptableWordCount } from "#lib/domain/task-response.ts";
	import { countWords } from "#lib/utils/stats.ts";
	import type { Criteria } from "#lib/domain/criteria.ts";
	import { isCriteriaKey } from "#lib/domain/criteria.ts";
	import { getZodErrors } from "#lib/utils/error.ts";
	import ValidationErrors from "#lib/components/ValidationErrors.svelte";
	import { saveEvaluation } from "#lib/remotes/command/save-evaluation.remote.ts";
	import { readAiStream } from "#lib/utils/stream.ts";
	import EvaluationCriteria from "./EvaluationCriteria.svelte";
	import { evaluateRequestSchema, type EvaluateRequest } from "#lib/domain/evaluate-request.ts";
	import { getPromptAcceptableWordCount } from "#lib/domain/task-prompt.ts";

	type Props = {
		practiceSessionId: string;
		practiceSessionContext: PracticeSessionContext;
		evaluation: Evaluation | undefined;
		isBusy: boolean;
		bandTarget: number | null;
		onAskTutor: (question: string) => void;
	};

	let { evaluation = $bindable(), isBusy = $bindable(), ...props }: Props = $props();

	let abortController = $state<AbortController>(new AbortController());
	let openCriterionKey = $state<Criteria | null>(null);

	const estimatedBand = $derived(evaluation?.estimatedBand);
	const promptWC = $derived(countWords(props.practiceSessionContext.prompt));
	const responseWC = $derived(countWords(props.practiceSessionContext.response));
	const [minPromptWC, maxPromptWC] = $derived(getPromptAcceptableWordCount());
	const [minResponseWC, maxResponseWC] = $derived(
		getResponseAcceptableWordCount(props.practiceSessionContext.category)
	);
	const isPromptWordCountMet = $derived(promptWC >= minPromptWC && promptWC <= maxPromptWC);
	const isResponseWordCountMet = $derived.by(() => {
		return responseWC >= minResponseWC && responseWC <= maxResponseWC;
	});
	const isImageAttached = $derived(Boolean(props.practiceSessionContext.imageName));
	const readiness = $derived.by(() => {
		const items = [
			{
				label: `Write prompt between ${minPromptWC} and ${maxPromptWC} words`,
				done: isPromptWordCountMet,
				hint: `${promptWC} / ${minPromptWC}`
			},
			{
				label: `Write response between ${minResponseWC} and ${maxResponseWC} words`,
				done: isResponseWordCountMet,
				hint: `${responseWC} / ${minResponseWC}`
			}
		];

		if (props.practiceSessionContext.category === "1") {
			items.push({
				label: "Attach the task image",
				done: isImageAttached,
				hint: props.practiceSessionContext.imageName ? "Attached" : "Required"
			});
		}

		return items;
	});

	function createEmptyEvaluation(category: "1" | "2"): Evaluation {
		const common = {
			summary: "",
			estimatedBand: 0
		};

		const emptyCriterion: EvaluationCriterion = {
			band: 0,
			checks: [],
			strengths: [],
			weaknesses: [],
			why: "",
			nextBandGap: ""
		};

		return category === "1"
			? {
					...common,
					taskCategory: "1",
					criteria: {
						taskAchievement: { ...emptyCriterion },
						coherenceAndCohesion: { ...emptyCriterion },
						lexicalResource: { ...emptyCriterion },
						grammaticalRangeAndAccuracy: { ...emptyCriterion }
					}
				}
			: {
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

	function weakestCriterionKey(current: Evaluation | undefined): Criteria | null {
		if (!current) {
			return null;
		}

		let weakest: { key: Criteria; band: number } | null = null;
		for (const [key, criterion] of Object.entries(current.criteria)) {
			if (!isCriteriaKey(key)) {
				continue;
			}

			if (weakest === null || criterion.band < weakest.band) {
				weakest = { key, band: criterion.band };
			}
		}
		return weakest?.key ?? null;
	}

	async function handleEvaluate() {
		let oldEvaluation;

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
			oldEvaluation = evaluation;
			evaluation = createEmptyEvaluation(props.practiceSessionContext.category);

			const response = await fetch(`${page.url.pathname}/evaluate`, {
				method: "POST",
				credentials: "include",
				signal: abortController.signal
			});

			if (!response.ok) {
				const error = await response.json<App.Error>();
				throw new Error(`${error.status} - ${error.message}.`);
			}

			const stream = response.body;
			if (!stream) {
				throw new Error("Could not read response body");
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

			await readAiStream(
				stream,
				(value) => parser.write(value),
				() => {
					openCriterionKey = weakestCriterionKey(evaluation);
				}
			);

			await saveEvaluation({ practiceSessionId: props.practiceSessionId, evaluation });
		} catch (e) {
			openModal({
				title: "Unable to evaluate",
				content: String(e),
				primaryButton: "Close"
			});
			evaluation = oldEvaluation;
		} finally {
			isBusy = false;
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
							class={[
								"radial-progress text-3xl font-bold",
								props.bandTarget && estimatedBand >= props.bandTarget
									? "text-success"
									: "text-warning"
							]}
							style:--value={convertBandToProgressValue(estimatedBand)}
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

				{#if evaluation}
					<EvaluationCriteria
						{evaluation}
						{isBusy}
						{openCriterionKey}
						onAskTutor={props.onAskTutor} />
				{/if}
			{/if}
		</div>

		<div class="flex items-center gap-2 p-3">
			{const isRequirementsMet = $derived(
				isPromptWordCountMet &&
					isResponseWordCountMet &&
					(props.practiceSessionContext.category === "2" || isImageAttached)
			)}
			<button
				class="btn flex-1 btn-primary"
				onclick={handleEvaluate}
				disabled={isBusy || !isRequirementsMet}>
				<span class={["loading hidden loading-infinity", isBusy && "inline-block"]}></span>
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
