import { getPageSession } from "#lib/server/auth/session.ts";
import { taskSubcategorySchema } from "#lib/domain/task.ts";
import {
	countLearnerTasks,
	getLearnerTaskStats,
	listLearnerTasks
} from "#lib/server/data/tasks.ts";
import type { PageServerLoad } from "./$types";

const PER_PAGE = 5;
const SORTS = ["recent", "oldest", "name", "practiced"] as const;
const TASK_CATEGORIES = ["1", "2"] as const;
const SOURCES = ["mine", "example"] as const;

type Sort = (typeof SORTS)[number];

export const load = (async ({ locals, url }) => {
	const { user } = getPageSession(locals);

	const searchParams = url.searchParams;
	const q = searchParams.get("q")?.trim() ?? "";
	const task = TASK_CATEGORIES.find((value) => value === searchParams.get("task"));
	const subcategoryParam = searchParams.get("subcategory");
	const subcategory = taskSubcategorySchema.safeParse(subcategoryParam).data;
	const sort: Sort = SORTS.find((value) => value === searchParams.get("sort")) ?? "recent";
	const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
	const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const source = SOURCES.find((value) => value === searchParams.get("source"));

	const filters = {
		q,
		category: task ?? null,
		subcategory: subcategory ?? null,
		source: source ?? null,
		sort
	};

	const total = await countLearnerTasks(user.id, filters);
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const safePage = Math.min(page, totalPages);

	const [tasks, stats] = await Promise.all([
		listLearnerTasks(user.id, filters, { page: safePage, perPage: PER_PAGE }),
		getLearnerTaskStats(user.id)
	]);

	return {
		tasks,
		stats,
		pagination: { page: safePage, perPage: PER_PAGE, total, totalPages },
		filters: {
			q,
			task: task ?? null,
			subcategory: subcategory ?? null,
			source: source ?? null,
			sort
		}
	};
}) satisfies PageServerLoad;
