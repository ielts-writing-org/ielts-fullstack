import { env } from "cloudflare:workers";
import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { taskSubcategorySchema } from "#lib/domain/task-subcategory.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getPageSession } from "#lib/server/auth/session.ts";
import type { PageServerLoad } from "./$types";

const PER_PAGE = 5;
const SORTS = ["recent", "oldest", "name", "practiced"] as const;
const TASK_CATEGORIES = ["1", "2"] as const;
const SOURCES = ["mine", "example"] as const;

type Sort = (typeof SORTS)[number];

export const load = (async ({ locals, url }) => {
	const { user } = getPageSession(locals);
	const db = getDb(env.IELTS_WRITING_DB);

	const searchParams = url.searchParams;
	const q = searchParams.get("q")?.trim() ?? "";
	const task = TASK_CATEGORIES.find((value) => value === searchParams.get("task"));
	const subcategoryParam = searchParams.get("subcategory");
	const subcategory = taskSubcategorySchema.safeParse(subcategoryParam).data;
	const sort: Sort = SORTS.find((value) => value === searchParams.get("sort")) ?? "recent";
	const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
	const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

	const source = SOURCES.find((value) => value === searchParams.get("source"));
	const activeTask = isNull(tasks.deletedAt);
	const ownTasks = and(eq(tasks.userId, user.id), activeTask)!;
	const publicExamples = and(
		isNull(tasks.userId),
		eq(tasks.published, true),
		activeTask
	)!;
	const visibility =
		source === "mine"
			? ownTasks
			: source === "example"
				? publicExamples
				: or(ownTasks, publicExamples)!;
	const conditions = [visibility];
	if (task) conditions.push(eq(tasks.category, task));
	if (subcategory) conditions.push(eq(tasks.subcategory, subcategory));
	if (q) {
		const pattern = `%${q}%`;
		conditions.push(or(like(tasks.prompt, pattern), like(tasks.subcategory, pattern))!);
	}
	const where = and(...conditions);

	const sessionCount = sql<number>`(select count(*) from "practice_sessions" where "practice_sessions"."task_id" = "tasks"."id")`;
	const bestBand = sql<
		number | null
	>`(select max(json_extract("evaluations"."result", '$.estimatedBand')) from "evaluations" inner join "practice_sessions" on "evaluations"."practice_session_id" = "practice_sessions"."id" where "practice_sessions"."task_id" = "tasks"."id")`;
	const lastPracticedAt = sql<
		number | null
	>`(select max("practice_sessions"."started_at") from "practice_sessions" where "practice_sessions"."task_id" = "tasks"."id")`;

	const [countRow] = await db
		.select({ total: sql<number>`count(*)` })
		.from(tasks)
		.where(where);

	const total = countRow?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const safePage = Math.min(page, totalPages);

	const orderBy = {
		recent: [desc(tasks.updatedAt)],
		oldest: [asc(tasks.updatedAt)],
		name: [asc(tasks.prompt)],
		practiced: [desc(lastPracticedAt), desc(tasks.updatedAt)]
	}[sort];

	const rows = await db
		.select({
			id: tasks.id,
			category: tasks.category,
			subcategory: tasks.subcategory,
			prompt: tasks.prompt,
			imageName: tasks.imageName,
			isExample: sql<boolean>`"tasks"."user_id" is null`,
			createdAt: tasks.createdAt,
			updatedAt: tasks.updatedAt,
			sessionCount,
			bestBand,
			lastPracticedAt
		})
		.from(tasks)
		.where(where)
		.orderBy(...orderBy)
		.limit(PER_PAGE)
		.offset((safePage - 1) * PER_PAGE);

	const [stats] = await db
		.select({
			total: sql<number>`count(*)`,
			task1: sql<number>`count(case when "tasks"."category" = '1' then 1 end)`,
			task2: sql<number>`count(case when "tasks"."category" = '2' then 1 end)`,
			unused: sql<number>`count(case when not exists (select 1 from "practice_sessions" where "practice_sessions"."task_id" = "tasks"."id") then 1 end)`
		})
		.from(tasks)
		.where(ownTasks);

	return {
		tasks: rows.map((row) => ({
			id: row.id,
			category: row.category,
			subcategory: row.subcategory,
			prompt: row.prompt,
			imageName: row.imageName,
			isExample: row.isExample,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			sessionCount: row.sessionCount,
			bestBand: row.bestBand,
			lastPracticedAt: row.lastPracticedAt === null ? null : new Date(row.lastPracticedAt)
		})),
		stats: {
			total: stats?.total ?? 0,
			task1: stats?.task1 ?? 0,
			task2: stats?.task2 ?? 0,
			unused: stats?.unused ?? 0
		},
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
