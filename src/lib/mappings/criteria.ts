import type { Criteria, CriterionCheckStatus } from "#lib/schemas/criteria.ts";

export const CRITERIA_MAP = {
	taskAchievement: "Task Achievement",
	taskResponse: "Task Response",
	coherenceAndCohesion: "Coherence & Cohesion",
	lexicalResource: "Lexical Resource",
	grammaticalRangeAndAccuracy: "Grammar Range & Accuracy"
} as const satisfies Record<Criteria, string>;

export const CRITERION_CHECK_STATUS_MAP = {
	met: "Met",
	partially_met: "Partially met",
	not_met: "Not met"
} as const satisfies Record<CriterionCheckStatus, string>;
