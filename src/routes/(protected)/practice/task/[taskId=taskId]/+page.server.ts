import type { PageServerLoad } from "./$types";
import type { TaskContext } from "#lib/schemas/task-context.ts";

const PAGE_TITLE = ["TASK 1", "TASK 2"] as const;
const PAGE_SUBTITLE = [
	"Write an essay on the given diagram",
	"Write an essay on the given topic"
] as const;

// TODO: Load task saved
const INITIAL_TASKS = [
	{
		id: "1",
		prompt: "",
		response: ""
	},
	{
		id: "2",
		prompt: "",
		response: ""
	}
] as const satisfies TaskContext[];

export const load = (async ({ params }) => {
	const { taskId } = params;

	const taskIdNumber = Number.parseInt(taskId);

	return {
		pageTitle: PAGE_TITLE[taskIdNumber - 1],
		pageSubtitle: PAGE_SUBTITLE[taskIdNumber - 1],
		task: INITIAL_TASKS[taskIdNumber - 1]
	};
}) satisfies PageServerLoad;
