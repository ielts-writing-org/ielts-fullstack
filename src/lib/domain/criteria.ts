import z from "zod";

export const criteriaForTask1Schema = z.enum([
	"taskAchievement",
	"coherenceAndCohesion",
	"lexicalResource",
	"grammaticalRangeAndAccuracy"
]);

export const criteriaForTask2Schema = z.enum([
	"taskResponse",
	"coherenceAndCohesion",
	"lexicalResource",
	"grammaticalRangeAndAccuracy"
]);

export const criteria = [
	...new Set([...criteriaForTask1Schema.options, ...criteriaForTask2Schema.options])
];

export const criterionCheckStatus = z.enum(["met", "partially_met", "not_met"]);

export type CriteriaForTask1 = z.infer<typeof criteriaForTask1Schema>;
export type CriteriaForTask2 = z.infer<typeof criteriaForTask2Schema>;
export type Criteria = CriteriaForTask1 | CriteriaForTask2;
export type CriterionCheckStatus = z.infer<typeof criterionCheckStatus>;
export const CRITERIA_LABELS = {
	taskAchievement: "Task Achievement",
	taskResponse: "Task Response",
	coherenceAndCohesion: "Coherence & Cohesion",
	lexicalResource: "Lexical Resource",
	grammaticalRangeAndAccuracy: "Grammar Range & Accuracy"
} as const satisfies Record<Criteria, string>;

export const CRITERION_CHECK_STATUS_LABELS = {
	met: "Met",
	partially_met: "Partially met",
	not_met: "Not met"
} as const satisfies Record<CriterionCheckStatus, string>;
export const isCriteriaKey = (key: unknown): key is Criteria => {
	return criteria.includes(key as Criteria);
};
