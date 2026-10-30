import type { Criteria, CriterionCheckStatus } from "#lib/schemas/criteria.ts";

export const CRITERIA_MAP = {
	taskAchievement: "Task Achievement",
	taskResponse: "Task Response",
	coherenceAndCohesion: "Coherence & Cohesion",
	lexicalResource: "Lexical Resource",
	grammaticalRangeAndAccuracy: "Grammar Range & Accuracy"
} as const satisfies Record<Criteria, string>;

export const CRITERION_CHECK_STATUS_MAP = [
	{ key: "met", label: "Met" },
	{ key: "partially_met", label: "Partially met" },
	{ key: "not_met", label: "Not met" }
] as const satisfies { key: CriterionCheckStatus; label: string }[];
