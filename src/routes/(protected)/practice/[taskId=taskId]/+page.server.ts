import type { PageServerLoad } from "./$types";
import type { TaskContext } from "#lib/schemas/task-context.ts";

const PAGE_TITLE = ["Draft #001", "Draft #001"] as const;
const PAGE_SUBTITLE = ["IELTS Writing task 1", "IELTS Writing task 2"] as const;

// TODO: Load task saved
const INITIAL_TASKS = [
	{
		id: "1",
		prompt: "",
		response: "",
		startAt: Date.now()
	},
	{
		id: "2",
		prompt: "",
		response: "",
		startAt: Date.now()
	}
] as const satisfies (TaskContext & { startAt: number })[];

export const load = (async ({ params }) => {
	const { taskId } = params;

	const taskIdNumber = Number.parseInt(taskId);

	return {
		pageTitle: PAGE_TITLE[taskIdNumber - 1],
		pageSubtitle: PAGE_SUBTITLE[taskIdNumber - 1],
		task: INITIAL_TASKS[taskIdNumber - 1]
	};
}) satisfies PageServerLoad;
