import type { TaskCategory } from "#lib/domain/task-category.ts";

const TASK_TIME_LIMIT_MINUTES: Record<TaskCategory, number> = {
	"1": 20,
	"2": 40
};

export function getTimeLimitInMinutes(category: TaskCategory): number {
	return TASK_TIME_LIMIT_MINUTES[category];
}

export function convertBandToProgressValue(band: number): number {
	return Math.max(0, Math.min(100, (band / 9) * 100));
}
