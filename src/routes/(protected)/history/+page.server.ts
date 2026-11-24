import type { PageServerLoad } from "./$types";
import { getCriterionBands } from "#lib/domain/evaluation.ts";
import { countWords } from "#lib/domain/text-stats.ts";
import { TASK_CATEGORIES } from "#lib/domain/task.ts";
import { PRACTICE_TYPES } from "#lib/domain/practice-session.ts";
import { getAllTaskSubcategories, taskSubcategorySchema } from "#lib/domain/task.ts";
import { getPageSession } from "#lib/server/auth/session.ts";
import {
	countLearnerHistorySessions,
	countLearnerSessions,
	getLearnerCategoryBandStats,
	getLearnerHistoryTrend,
	listLearnerHistorySessions
} from "#lib/server/data/practice-sessions.ts";

const PER_PAGE = 5;
const SORTS = ["recent", "oldest", "band", "words"] as const;
const STATUSES = ["evaluated", "unevaluated"] as const;

type Sort = (typeof SORTS)[number];

export const load = (async ({ locals, url }) => {
	const { user } = getPageSession(locals);

	const searchParams = url.searchParams;
	const q = searchParams.get("q")?.trim() ?? "";
	const task = TASK_CATEGORIES.find((value) => value === searchParams.get("task"));
	const type = PRACTICE_TYPES.find((value) => value === searchParams.get("type"));
	const status = STATUSES.find((value) => value === searchParams.get("status"));
	const includeBody = searchParams.get("body") === "1";
	const subcategoryParam = searchParams.get("subcategory");
	const subcategory = taskSubcategorySchema.safeParse(subcategoryParam).data;
	const sort: Sort = SORTS.find((value) => value === searchParams.get("sort")) ?? "recent";
	const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
	const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

	const filters = {
		q,
		task: task ?? null,
		subcategory: subcategory ?? null,
		type: type ?? null,
		status: status ?? null,
		includeBody,
		sort
	};

	const total = await countLearnerHistorySessions(user.id, filters);
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const safePage = Math.min(page, totalPages);

	const [rows, totalSessions, trend, categoryStats] = await Promise.all([
		listLearnerHistorySessions(user.id, filters, { page: safePage, perPage: PER_PAGE }),
		countLearnerSessions(user.id),
		getLearnerHistoryTrend(user.id, 15),
		getLearnerCategoryBandStats(user.id)
	]);

	const task1 = categoryStats.task1;
	const task2 = categoryStats.task2;

	return {
		practiceSessions: rows.map((row) => {
			const result = row.evaluationResult ?? undefined;

			return {
				id: row.id,
				name: row.name,
				taskCategory: row.taskCategory,
				taskSubcategory: row.taskSubcategory,
				taskPrompt: row.taskPrompt,
				type: row.type,
				updatedAt: row.updatedAt,
				response: row.response,
				words: countWords(row.response),
				estimatedBand: result?.estimatedBand,
				criteria: getCriterionBands(result)
			};
		}),
		availableSubcategories: getAllTaskSubcategories(),
		stats: {
			total: totalSessions,
			evaluated: task1.evaluated + task2.evaluated,
			task1,
			task2
		},
		pagination: { page: safePage, perPage: PER_PAGE, total, totalPages },
		trend,
		filters: {
			q,
			task: task ?? null,
			subcategory: subcategory ?? null,
			type: type ?? null,
			status: status ?? null,
			body: includeBody,
			sort
		}
	};
}) satisfies PageServerLoad;
