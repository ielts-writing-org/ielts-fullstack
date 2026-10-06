import { evaluateRequestSchema, type EvaluateRequest } from "#lib/schemas/evaluate-request.ts";
import type { Evaluation } from "#lib/schemas/evaluation.ts";

const CRITERIA_KEYS = [
	"coherence_and_cohesion",
	"grammatical_range_and_accuracy",
	"lexical_resource",
	"task_response"
] as const satisfies readonly (keyof Evaluation["criteria"])[];

type CriteriaKeys = (typeof CRITERIA_KEYS)[number];

export const isCriteriaKey = (key: unknown): key is CriteriaKeys => {
	return CRITERIA_KEYS.includes(key as CriteriaKeys);
};

export function parseEvaluateRequestForm(formData: FormData): EvaluateRequest {
	const request = formData.get("request");

	if (typeof request !== "string") {
		throw new Error("Missing 'request'");
	}

	const data = JSON.parse(request);

	const image = formData.get("image");

	return evaluateRequestSchema.parse({
		...data,
		...(image instanceof File ? { image } : {})
	});
}

export function buildEvaluateRequestFormData(request: EvaluateRequest) {
	const form = new FormData();

	form.set(
		"request",
		JSON.stringify(request, (k, v) => (k === "image" ? undefined : (v as unknown)))
	);

	if (request.id === "1" && request.image) {
		form.set("image", request.image);
	}

	return form;
}
