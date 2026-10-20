<script lang="ts">
	import { page } from "$app/state";
	import { ListChecks } from "@lucide/svelte";
	import JSONParser from "@streamparser/json/jsonparser.js";
	import { type EventSourceMessage, EventSourceParserStream } from "eventsource-parser/stream";
	import { ZodError } from "zod";
	import type { Evaluation, EvaluationCriterion } from "#lib/schemas/evaluation.ts";
	import type { PracticeSessionContext } from "#lib/schemas/task-context.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import { type EvaluateRequest, evaluateRequestSchema } from "#lib/schemas/evaluate-request.ts";
	import { getFirstZodError } from "#lib/utils/error.ts";
	import { buildEvaluateRequestFormData, isCriteriaKey } from "./utils";
	import { saveEvaluation } from "./save-evaluation.remote";

	type Props = {
		practiceSessionId: string;
		practiceSessionContext: PracticeSessionContext;
		evaluation: Evaluation | undefined;
	};

	let { practiceSessionId, evaluation = $bindable(), practiceSessionContext }: Props = $props();

	let isExecuting = $state(false);
	let abortController = $state<AbortController>(new AbortController());

	const CRITERIA_MAP = {
		taskResponse: "Task Response",
		coherenceAndCohesion: "Coherence and Cohesion",
		grammaticalRangeAndAccuracy: "Grammatical Range and Accuracy",
		lexicalResource: "Lexical Resource"
	} as const satisfies Record<keyof Evaluation["criteria"], string>;

	const EMPTY_CRITERION = {
		band: null,
		checks: [],
		problems: [],
		whyNotNextBand: undefined,
		whyThisBand: ""
	} satisfies EvaluationCriterion;

	async function handleEvaluate() {
		try {
			if (isExecuting) {
				abortController.abort();
				abortController = new AbortController();
				return;
			}

			const request = mapToEvaluateRequest(practiceSessionContext);
			const vRequest = evaluateRequestSchema.parse(request);
			const form = buildEvaluateRequestFormData(vRequest);

			isExecuting = true;
			evaluation = {
				criteria: {
					coherenceAndCohesion: { ...EMPTY_CRITERION },
					grammaticalRangeAndAccuracy: { ...EMPTY_CRITERION },
					lexicalResource: { ...EMPTY_CRITERION },
					taskResponse: { ...EMPTY_CRITERION }
				},
				overallBand: null
			};

			const response = await fetch(`${page.url.pathname}/evaluate`, {
				body: form,
				credentials: "include",
				method: "POST",
				signal: abortController.signal
			});

			if (!response.ok) {
				throw new Error("There was a problem while contacting the server");
			}

			const stream = response.body;
			if (!stream) {
				throw new Error("Cannot read response body");
			}

			const parser = new JSONParser({ paths: ["$", "$.*", "$.criteria.*"] });
			parser.onValue = ({ key, stack, value }) => {
				if (!evaluation || !value) {
					return;
				}

				if (stack.length === 1 && key === "overallBand") {
					evaluation.overallBand = value as Evaluation["overallBand"];
				} else if (stack.length === 2 && stack[1]?.key === "criteria" && isCriteriaKey(key)) {
					evaluation.criteria[key] = value as EvaluationCriterion;
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
			if (e instanceof ZodError) {
				const error = getFirstZodError(e);
				openModal({ content: error.message, primaryButton: "Close", title: error.title });
			} else {
				openModal({
					content: String(e),
					primaryButton: "Close",
					title: "Unable to evaluate"
				});
			}

			evaluation = undefined;
		} finally {
			isExecuting = false;
			if (evaluation) {
				await saveEvaluation({ practiceSessionId, evaluation });
			}
		}
	}

	function mapToEvaluateRequest(context: PracticeSessionContext): EvaluateRequest {
		if (context.category === "1") {
			if (!context.image) {
				throw new Error("Task 1 requires an image before submitting for evaluation.");
			}
			return {
				id: "1",
				image: context.image,
				prompt: context.prompt,
				response: context.response
			};
		}

		return { id: "2", prompt: context.prompt, response: context.response };
	}
</script>

<div class={["h-full w-full rounded-box", isExecuting && "aura aura-holo"]}>
	<div class="flex h-full w-full flex-col gap-2 rounded-box bg-base-100 p-3">
		<div class="flex flex-1 flex-col gap-2 overflow-y-auto">
			{#if evaluation === undefined}
				<div class="flex flex-1 flex-col items-center justify-center gap-2 text-base-content/75">
					<ListChecks size="2em" />
					No evaluations yet.
				</div>
			{:else}
				{#each Object.entries(evaluation.criteria) as [name, criterion] (name)}
					<details class="collapse-arrow collapse bg-base-100">
						<summary class="collapse-title cursor-pointer p-0">
							<span class="font-semibold">
								{CRITERIA_MAP[name as keyof Evaluation["criteria"]] || name}
							</span>

							{#if criterion.band}
								{const band = $state(criterion.band)}
								<div
									class={[
										band! >= 7.5 && "text-success",
										band! >= 6.5 && criterion.band! < 7.5 && "text-warning",
										band! < 6.5 && "text-error"
									]}>
									Band {band.toPrecision(2)}
								</div>
							{:else if isExecuting}
								<div class="animate-pulse text-base-content/75">Analyzing…</div>
							{/if}
						</summary>
						{#if criterion.whyThisBand}
							{const checks = $state(criterion.checks)}
							{const problems = $state(criterion.problems)}

							<div class="collapse-content text-sm">
								<p class="text-base-content/75">
									<span class="font-semibold">Summary:</span>
									{criterion.whyThisBand}
								</p>
								<p class="text-base-content/75">
									<span class="font-semibold">Advice:</span>
									{criterion.whyNotNextBand}
								</p>
								{#if checks && checks.length > 0}
									<p class="mt-2 font-semibold text-base-content/75">Checks:</p>
									<ul class="list pl-6">
										{#each checks as check (check.id)}
											<li class="list-decimal py-1">
												<details class="collapse">
													<summary
														class="collapse-title flex cursor-pointer flex-col justify-between p-0 sm:flex-row">
														<span>{check.name}</span>
														<span
															class={[
																"badge badge-sm",
																check.status === "met" && "badge-success",
																check.status === "partially_met" && "badge-warning",
																check.status === "not_met" && "badge-error"
															]}>
															{check.status}
														</span>
													</summary>
													<div class="collapse-content p-0 text-base-content/75">
														{check.why}
													</div>
												</details>
											</li>
										{/each}
									</ul>
								{/if}

								{#if problems && problems.length > 0}
									<p class="mt-2 font-semibold text-base-content/75">Problems:</p>
									<ul class="list pl-6">
										{#each problems as problem, i (i)}
											<li class="list-decimal py-1">
												<details class="collapse">
													<summary
														class="collapse-title flex cursor-pointer flex-col justify-between p-0 sm:flex-row">
														{problem.name}
													</summary>
													<div class="collapse-content px-0 text-base-content/75">
														<p>
															<span class="font-semibold">Evidence:</span>
															{problem.evidence}
														</p>
														<p>
															<span class="font-semibold">Advice:</span>
															{problem.advice}
														</p>
													</div>
												</details>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/if}
					</details>
				{/each}
			{/if}
		</div>

		<div class="flex items-center justify-between">
			<button class="group btn btn-primary" onclick={handleEvaluate} disabled={isExecuting}>
				<span class="loading loading-spinner not-group-disabled:hidden"></span>
				Evaluate
			</button>
			{#if evaluation}
				{const band = $state(evaluation.overallBand)}
				{#if band}
					<div
						class={[
							"badge",
							band >= 7.5 && "badge-success",
							band >= 6.5 && band < 7.5 && "badge-warning",
							band < 6.5 && "badge-error"
						]}>
						Est. Band {band.toPrecision(2)}
					</div>
				{:else if isExecuting}
					<div class="badge animate-pulse badge-ghost">Estimating...</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
