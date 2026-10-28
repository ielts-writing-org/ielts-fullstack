import type { CriterionKeys } from "#lib/schemas/evaluation.ts";

export const CRITERIA_MAP = [
	{ key: "taskAchievement", label: "Task Achievement" },
	{ key: "taskResponse", label: "Task Response" },
	{ key: "coherenceAndCohesion", label: "Coherence & Cohesion" },
	{ key: "lexicalResource", label: "Lexical Resource" },
	{ key: "grammaticalRangeAndAccuracy", label: "Grammar Range & Accuracy" }
] as const satisfies { key: CriterionKeys; label: string }[];
