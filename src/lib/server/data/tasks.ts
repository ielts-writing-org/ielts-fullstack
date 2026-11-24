import { and, asc, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import type { TaskCategory } from "#lib/domain/task.ts";
import type { TaskSubcategory } from "#lib/domain/task.ts";
import { users } from "../db/auth.schema";
import { evaluations, practiceSessions, tasks } from "../db/app.schema";
import { getDatabase } from "../db/index.ts";

export type TaskDifficulty = "beginner" | "intermediate" | "advanced";

export type NewTask = {
	userId: string | null;
	category: TaskCategory;
	subcategory: TaskSubcategory<TaskCategory> | null;
	topic?: string | null;
	difficulty?: TaskDifficulty | null;
	prompt: string;
	imageName?: string | null;
	published?: boolean;
};

export function insertTask(values: NewTask) {
	return getDatabase().insert(tasks).values(values).returning({ id: tasks.id });
}

export function findTaskById(taskId: string) {
	return getDatabase().query.tasks.findFirst({
		where: { id: taskId }
	});
}

/** The task when it is active and either owned by the user or a published system task. */
export function findPracticableTaskCategory(taskId: string, userId: string) {
	return getDatabase().query.tasks.findFirst({
		columns: { category: true },
		where: {
			id: taskId,
			deletedAt: { isNull: true },
			OR: [{ userId }, { userId: { isNull: true }, published: true }]
		}
	});
}

export function findOwnedTask(userId: string, taskId: string) {
	return getDatabase().query.tasks.findFirst({
		where: { id: taskId, userId }
	});
}

export async function updateOwnedTask(
	userId: string,
	taskId: string,
	data: {
		prompt?: string;
		subcategory?: TaskSubcategory<TaskCategory> | null;
		imageName?: string | null;
	}
): Promise<boolean> {
	const result = await getDatabase()
		.update(tasks)
		.set(data)
		.where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
	return result.meta.changes > 0;
}

export async function deleteOwnedTask(userId: string, taskId: string): Promise<boolean> {
	const result = await getDatabase()
		.delete(tasks)
		.where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
	return result.meta.changes > 0;
}

/** Learner practice sessions attached to a task, newest first. */
export async function listTaskDependantSessions(taskId: string) {
	const rows = await getDatabase()
		.select({
			id: practiceSessions.id,
			name: practiceSessions.name,
			type: practiceSessions.type,
			updatedAt: practiceSessions.updatedAt,
			estimatedBand: sql<number | null>`json_extract(${evaluations.result}, '$.estimatedBand')`
		})
		.from(practiceSessions)
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.taskId, taskId))
		.orderBy(desc(practiceSessions.updatedAt));
	return rows;
}

/**
 * Creates a new task row copying the given version's content, with overrides.
 * Returns `null` when the source version no longer exists.
 */
export async function createTaskVersion(
	taskId: string,
	changes: {
		subcategory?: TaskSubcategory<TaskCategory> | null;
		topic?: string | null;
		difficulty?: TaskDifficulty | null;
		prompt?: string;
		imageName?: string | null;
		published?: boolean;
	}
): Promise<string | null> {
	const source = await findTaskById(taskId);
	if (!source) return null;
	const [created] = await insertTask({
		userId: source.userId,
		category: source.category,
		subcategory: changes.subcategory ?? source.subcategory,
		topic: changes.topic ?? source.topic,
		difficulty: changes.difficulty ?? source.difficulty,
		prompt: changes.prompt ?? source.prompt,
		imageName: changes.imageName ?? source.imageName,
		published: changes.published ?? source.published
	});
	return created.id;
}

/** Soft-archives an active task; `false` means it was changed concurrently. */
export async function archiveTask(taskId: string): Promise<boolean> {
	const result = await getDatabase()
		.update(tasks)
		.set({ deletedAt: new Date(), published: false })
		.where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)));
	return result.meta.changes === 1;
}

export async function deleteTaskById(taskId: string): Promise<boolean> {
	const result = await getDatabase().delete(tasks).where(eq(tasks.id, taskId));
	return result.meta.changes === 1;
}

/** Restores a previously archived task; `false` means it was changed concurrently. */
export async function restoreTask(taskId: string, unpublish: boolean): Promise<boolean> {
	const result = await getDatabase()
		.update(tasks)
		.set({ deletedAt: null, ...(unpublish ? { published: false } : {}) })
		.where(and(eq(tasks.id, taskId), sql`${tasks.deletedAt} IS NOT NULL`));
	return result.meta.changes === 1;
}

/** Publishes or hides a system task; `false` means it was changed concurrently. */
export async function setSystemTaskPublished(taskId: string, published: boolean): Promise<boolean> {
	const result = await getDatabase()
		.update(tasks)
		.set({ published })
		.where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt), isNull(tasks.userId)));
	return result.meta.changes === 1;
}

export type LearnerTaskFilters = {
	q: string;
	category: TaskCategory | null;
	subcategory: TaskSubcategory<TaskCategory> | null;
	source: "mine" | "example" | null;
	sort: "recent" | "oldest" | "name" | "practiced";
};

function learnerVisibility(userId: string, source: LearnerTaskFilters["source"]) {
	const active = isNull(tasks.deletedAt);
	const own = and(eq(tasks.userId, userId), active)!;
	const examples = and(isNull(tasks.userId), eq(tasks.published, true), active)!;
	return source === "mine" ? own : source === "example" ? examples : or(own, examples)!;
}

function learnerTaskConditions(userId: string, filters: LearnerTaskFilters) {
	const conditions = [learnerVisibility(userId, filters.source)];
	if (filters.category) conditions.push(eq(tasks.category, filters.category));
	if (filters.subcategory) conditions.push(eq(tasks.subcategory, filters.subcategory));
	if (filters.q) {
		const pattern = `%${filters.q}%`;
		conditions.push(or(like(tasks.prompt, pattern), like(tasks.subcategory, pattern))!);
	}
	return and(...conditions)!;
}

function learnerTaskOrder(sort: LearnerTaskFilters["sort"]) {
	const lastPracticedAt = sql<
		number | null
	>`(select max("practice_sessions"."started_at") from "practice_sessions" where "practice_sessions"."task_id" = "tasks"."id" and "practice_sessions"."deleted_at" IS NULL)`;
	return {
		recent: [desc(tasks.updatedAt)],
		oldest: [asc(tasks.updatedAt)],
		name: [asc(tasks.prompt)],
		practiced: [desc(lastPracticedAt), desc(tasks.updatedAt)]
	}[sort];
}

export async function countLearnerTasks(userId: string, filters: LearnerTaskFilters) {
	const [row] = await getDatabase()
		.select({ total: sql<number>`count(*)` })
		.from(tasks)
		.where(learnerTaskConditions(userId, filters));
	return row?.total ?? 0;
}

export async function listLearnerTasks(
	userId: string,
	filters: LearnerTaskFilters,
	paging: { page: number; perPage: number }
) {
	const sessionCount = sql<number>`(select count(*) from "practice_sessions" where "practice_sessions"."task_id" = "tasks"."id" and "practice_sessions"."deleted_at" IS NULL)`;
	const bestBand = sql<
		number | null
	>`(select max(json_extract("evaluations"."result", '$.estimatedBand')) from "evaluations" inner join "practice_sessions" on "evaluations"."practice_session_id" = "practice_sessions"."id" where "practice_sessions"."task_id" = "tasks"."id" and "practice_sessions"."deleted_at" IS NULL)`;
	const lastPracticedAt = sql<
		number | null
	>`(select max("practice_sessions"."started_at") from "practice_sessions" where "practice_sessions"."task_id" = "tasks"."id" and "practice_sessions"."deleted_at" IS NULL)`;

	const rows = await getDatabase()
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
		.where(learnerTaskConditions(userId, filters))
		.orderBy(...learnerTaskOrder(filters.sort))
		.limit(paging.perPage)
		.offset((paging.page - 1) * paging.perPage);

	return rows.map((row) => ({
		...row,
		lastPracticedAt: row.lastPracticedAt === null ? null : new Date(row.lastPracticedAt)
	}));
}

/** Totals over the user's own active tasks for the tasks-page stat cards. */
export async function getLearnerTaskStats(userId: string) {
	const [stats] = await getDatabase()
		.select({
			total: sql<number>`count(*)`,
			task1: sql<number>`count(case when "tasks"."category" = '1' then 1 end)`,
			task2: sql<number>`count(case when "tasks"."category" = '2' then 1 end)`,
			unused: sql<number>`count(case when not exists (select 1 from "practice_sessions" where "practice_sessions"."task_id" = "tasks"."id") then 1 end)`
		})
		.from(tasks)
		.where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

	return {
		total: stats?.total ?? 0,
		task1: stats?.task1 ?? 0,
		task2: stats?.task2 ?? 0,
		unused: stats?.unused ?? 0
	};
}

export type AdminTaskFilters = {
	page: number;
	pageSize: number;
	search: string;
	category: "all" | TaskCategory;
	source: "all" | "system" | "personal";
	visibility: "all" | "shown" | "hidden";
	status: "active" | "archived";
};

function adminTaskConditions(filters: AdminTaskFilters) {
	const conditions = [];
	if (filters.category !== "all") conditions.push(eq(tasks.category, filters.category));
	if (filters.source === "system") conditions.push(isNull(tasks.userId));
	if (filters.source === "personal") conditions.push(sql`${tasks.userId} IS NOT NULL`);
	if (filters.visibility === "shown") conditions.push(eq(tasks.published, true));
	if (filters.visibility === "hidden") conditions.push(eq(tasks.published, false));
	if (filters.status === "active") conditions.push(isNull(tasks.deletedAt));
	if (filters.status === "archived") conditions.push(sql`${tasks.deletedAt} IS NOT NULL`);
	if (filters.search) {
		const pattern = `%${filters.search}%`;
		conditions.push(
			or(like(tasks.prompt, pattern), like(tasks.topic, pattern), like(tasks.subcategory, pattern))!
		);
	}
	return conditions.length ? and(...conditions) : undefined;
}

export async function countAdminTasks(filters: AdminTaskFilters) {
	const [row] = await getDatabase()
		.select({ total: count() })
		.from(tasks)
		.where(adminTaskConditions(filters));
	return row?.total ?? 0;
}

export function listAdminTasks(filters: AdminTaskFilters) {
	return getDatabase()
		.select({
			id: tasks.id,
			userId: tasks.userId,
			ownerName: users.name,
			category: tasks.category,
			subcategory: tasks.subcategory,
			topic: tasks.topic,
			difficulty: tasks.difficulty,
			published: tasks.published,
			prompt: tasks.prompt,
			image: tasks.imageName,
			createdAt: tasks.createdAt,
			updatedAt: tasks.updatedAt,
			deletedAt: tasks.deletedAt
		})
		.from(tasks)
		.leftJoin(users, eq(tasks.userId, users.id))
		.where(adminTaskConditions(filters))
		.orderBy(desc(tasks.updatedAt))
		.limit(filters.pageSize)
		.offset((filters.page - 1) * filters.pageSize);
}
