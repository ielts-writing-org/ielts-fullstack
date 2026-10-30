import type { TaskCategory } from "#lib/schemas/task-category.ts";
import type { EvaluateRequest } from "#lib/schemas/evaluate-request.ts";
import type { DeterministicStats } from "#lib/utils/stats.ts";

export type EvaluateRequestWithStats = EvaluateRequest & {
	task: { category: "1"; image: string } | { category: "2" };
	practiceSession: { stats: DeterministicStats };
};

export interface EvaluationClient {
	execute(
		taskCategory: TaskCategory,
		request: EvaluateRequestWithStats,
		signal: AbortSignal
	): Promise<ReadableStream>;
}
