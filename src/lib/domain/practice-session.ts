import { taskCategorySchema, type TaskCategory } from "./task.ts";
import { z } from "zod";

// --- Practice type ---

export const PRACTICE_TYPES = ["free", "timed"] as const;
export type PracticeType = (typeof PRACTICE_TYPES)[number];

export const practiceTypeSchema = z.enum(PRACTICE_TYPES, "Practice type must be free or timed.");

// --- Official timing ---

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

// --- Practice streak ---

/** Counts consecutive practice days ending today or yesterday, from ISO day strings. */
export function computePracticeStreak(days: string[]): number {
	if (days.length === 0) {
		return 0;
	}

	const daySet = new Set(days);
	const dayKey = (date: Date) => date.toISOString().slice(0, 10);
	const cursor = new Date();

	if (!daySet.has(dayKey(cursor))) {
		cursor.setUTCDate(cursor.getUTCDate() - 1);
		if (!daySet.has(dayKey(cursor))) {
			return 0;
		}
	}

	let streak = 0;
	while (daySet.has(dayKey(cursor))) {
		streak++;
		cursor.setUTCDate(cursor.getUTCDate() - 1);
	}
	return streak;
}

// --- AI context ---

export const practiceSessionContextSchema = z.object({
	category: taskCategorySchema,
	image: z.instanceof(File).optional(),
	imageName: z.string().optional(),
	prompt: z.string(),
	response: z.string()
});

export type PracticeSessionContext = z.infer<typeof practiceSessionContextSchema>;
