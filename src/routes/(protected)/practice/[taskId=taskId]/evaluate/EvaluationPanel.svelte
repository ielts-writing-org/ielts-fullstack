<script lang="ts">
	import { evaluateRequestSchema, type EvaluateRequest } from "#lib/schemas/evaluate-request.ts";
	import type { Evaluation, EvaluationCriterion } from "#lib/schemas/evaluation.ts";
	import type { TaskContext } from "#lib/schemas/task-context.ts";
	import { getFirstZodError } from "#lib/utils/error.ts";
	import { ListChecks } from "@lucide/svelte";
	import JSONParser from "@streamparser/json/jsonparser.js";
	import { ZodError } from "zod";
	import { buildEvaluateRequestFormData, isCriteriaKey } from "./utils";
	import { EventSourceParserStream, type EventSourceMessage } from "eventsource-parser/stream";
	import { page } from "$app/state";
	import { openModal } from "#lib/components/modal/Modal.svelte";

	type Props = {
		taskContext: TaskContext;
		evaluation?: Evaluation;
	};

	let { taskContext, evaluation = $bindable() }: Props = $props();

	let isExecuting = $state(false);
	let abortController = $state<AbortController>(new AbortController());

	const CRITERIA_MAP = {
		coherence_and_cohesion: "Coherence and Cohesion",
		grammatical_range_and_accuracy: "Grammatical Range and Accuracy",
		lexical_resource: "Lexical Resource",
		task_response: "Task Response"
	} as const satisfies Record<keyof Evaluation["criteria"], string>;

	const EMPTY_CRITERION = {
		band: null,
		checks: [],
		problems: [],
		why_this_band: "",
		why_not_next_band: undefined
	} satisfies EvaluationCriterion;

	async function handleEvaluate() {
		try {
			if (isExecuting) {
				abortController?.abort();
				abortController = new AbortController();
				return;
			}

			const request = mapToEvaluateRequest(taskContext);
			const vRequest = evaluateRequestSchema.parse(request);
			const form = buildEvaluateRequestFormData(vRequest);

			isExecuting = true;
			evaluation = {
				criteria: {
					coherence_and_cohesion: { ...EMPTY_CRITERION },
					grammatical_range_and_accuracy: { ...EMPTY_CRITERION },
					lexical_resource: { ...EMPTY_CRITERION },
					task_response: { ...EMPTY_CRITERION }
				},
				overall_band: null
			};

			const response = await fetch(`${page.url.pathname}/evaluate`, {
				credentials: "include",
				method: "POST",
				body: form,
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

				if (stack.length === 1 && key === "overall_band") {
					evaluation.overall_band = value as Evaluation["overall_band"];
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
							if (chunk.data === "[DONE]") return;

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
				openModal({ title: error.title, content: error.message, primaryButton: { text: "Close" } });
			} else {
				openModal({
					title: "Unable to evaluate",
					content: String(e),
					primaryButton: { text: "Close" }
				});
			}

			evaluation = undefined;
		} finally {
			isExecuting = false;
		}
	}

	function mapToEvaluateRequest(context: TaskContext): EvaluateRequest {
		if (context.id === "1") {
			if (!context.image) {
				throw new Error("Task 1 requires an image before submitting for evaluation.");
			}
			return {
				id: "1",
				prompt: context.prompt,
				response: context.response,
				image: context.image
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
						<summary class="collapse-title cursor-pointer p-0 font-semibold">
							<div>
								{CRITERIA_MAP[name as keyof Evaluation["criteria"]] || name}
							</div>
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
						{#if criterion.why_this_band}
							{const checks = $state(criterion.checks)}
							{const problems = $state(criterion.problems)}

							<div class="collapse-content text-sm">
								<p class="text-base-content/75">{criterion.why_this_band}</p>
								<p class="indent-2 text-base-content/75">
									<span class="font-semibold">Advice:</span>
									{criterion.why_not_next_band}
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
													<div class="collapse-content p-0 indent-2 text-base-content/75">
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
										{#each problems as problem (problem.name)}
											<li class="list-decimal py-1">
												<details class="collapse">
													<summary
														class="collapse-title flex cursor-pointer flex-col justify-between p-0 sm:flex-row">
														{problem.name}
													</summary>
													<div class="collapse-content text-base-content/75">
														{problem.description}
													</div>
													<div class="collapse-content text-base-content/75">
														<span class="font-semibold">Advice:</span>
														{problem.advice}
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
				{const band = $state(evaluation.overall_band)}
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
