import type { TaskCategory } from "./task-category.ts";

/** Official IELTS Writing time limits in minutes. */
export const TASK_TIME_LIMIT_MINUTES: Record<TaskCategory, number> = {
	"1": 20,
	"2": 40
};

export function getTimeLimitInMinutes(category: TaskCategory): number {
	return TASK_TIME_LIMIT_MINUTES[category];
}

export function getTimeLimitInSeconds(category: TaskCategory): number {
	return getTimeLimitInMinutes(category) * 60;
}

/** Epoch seconds at which a timed session that started at `startedAt` ends. */
export function getDeadlineEpochSeconds(startedAt: Date | number, category: TaskCategory): number {
	const startedAtMs = startedAt instanceof Date ? startedAt.getTime() : startedAt;
	return getTimeLimitInSeconds(category) + Math.floor(startedAtMs / 1000);
}

/** Whole seconds left until `deadlineEpochSeconds`, never negative. */
export function getRemainingSeconds(
	deadlineEpochSeconds: number,
	nowMs: number = Date.now()
): number {
	return Math.max(0, deadlineEpochSeconds - Math.floor(nowMs / 1000));
}
