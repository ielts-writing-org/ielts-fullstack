import type { TaskCategory } from "#lib/schemas/task-category.ts";

/**
 * Shared IELTS Writing rules used by the practice UI.
 *
 * These values mirror the official exam requirements: Task 1 has a 20 minute
 * limit and a 150 word minimum, Task 2 has a 40 minute limit and a 250 word
 * minimum. Keeping them in one place avoids the UI drifting from the paper.
 */
export const TASK_MIN_WORDS: Record<TaskCategory, number> = {
	"1": 150,
	"2": 250
};

export const TASK_TIME_LIMIT_MINUTES: Record<TaskCategory, number> = {
	"1": 20,
	"2": 40
};

export function minWordsFor(category: TaskCategory): number {
	return TASK_MIN_WORDS[category];
}

export function timeLimitMinutesFor(category: TaskCategory): number {
	return TASK_TIME_LIMIT_MINUTES[category];
}

/** Tailwind text color tone for a band score, matching the history dashboard. */
export function bandTone(band: number): string {
	if (band >= 7.5) return "text-success";
	if (band >= 5.5) return "text-warning";
	return "text-error";
}

/** DaisyUI badge color suffix for a band score. */
export function bandBadgeTone(band: number): "success" | "warning" | "error" {
	if (band >= 7.5) return "success";
	if (band >= 5.5) return "warning";
	return "error";
}

/** Convert a band score (0-9) into a progress value for `radial-progress`. */
export function bandToProgressValue(band: number): number {
	return Math.max(0, Math.min(100, (band / 9) * 100));
}
