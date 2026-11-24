import { and, asc, count, desc, eq, gte, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import type { PracticeType } from "#lib/domain/practice-session.ts";
import type { TaskCategory } from "#lib/domain/task.ts";
import type { TaskSubcategory } from "#lib/domain/task.ts";
import { evaluations, practiceSessions, tasks } from "../db/app.schema";
import { users } from "../db/auth.schema";
import { getDatabase } from "../db/index.ts";

const evaluatedBand = sql`json_extract(${evaluations.result}, '$.estimatedBand')`;

function normalizedResponseSql() {
	return sql`replace(replace(replace(${practiceSessions.response}, char(13), ' '), char(10), ' '), char(9), ' ')`;
}

export function insertPracticeSession(values: {
	userId: string;
	taskId: string;
	name: string;
	type: PracticeType;
	response: string;
}) {
	return getDatabase()
		.insert(practiceSessions)
		.values(values)
		.returning({ id: practiceSessions.id });
}

export function findOwnedPracticeSessionId(userId: string, practiceSessionId: string) {
	return getDatabase().query.practiceSessions.findFirst({
		columns: { id: true },
		where: { id: practiceSessionId, userId }
	});
}

export function findPracticeSessionById(practiceSessionId: string) {
	return getDatabase().query.practiceSessions.findFirst({
		columns: { id: true },
		where: { id: practiceSessionId }
	});
}

/** Everything the practice workspace page renders, scoped to its owner. */
export function findOwnedPracticeSessionDetail(userId: string, practiceSessionId: string) {
	return getDatabase().query.practiceSessions.findFirst({
		columns: {
			id: true,
			name: true,
			type: true,
			response: true,
			timeUpAction: true,
			startedAt: true
		},
		where: { id: practiceSessionId, userId },
		with: {
			task: {
				columns: {
					id: true,
					userId: true,
					category: true,
					subcategory: true,
					prompt: true,
					imageName: true
				}
			},
			evaluation: { columns: { result: true } },
			chatMessages: { columns: { from: true, message: true } }
		}
	});
}

function updateOwnedPracticeSession(
	userId: string,
	practiceSessionId: string,
	data: Record<string, unknown>
) {
	return getDatabase()
		.update(practiceSessions)
		.set(data)
		.where(and(eq(practiceSessions.id, practiceSessionId), eq(practiceSessions.userId, userId)));
}

export async function updateOwnedPracticeSessionResponse(
	userId: string,
	practiceSessionId: string,
	response: string
): Promise<boolean> {
	const result = await updateOwnedPracticeSession(userId, practiceSessionId, { response });
	return result.meta.changes > 0;
}

export async function updateOwnedPracticeSessionName(
	userId: string,
	practiceSessionId: string,
	name: string
): Promise<boolean> {
	const result = await updateOwnedPracticeSession(userId, practiceSessionId, { name });
	return result.meta.changes > 0;
}

export async function updateOwnedPracticeSessionTimeUpAction(
	userId: string,
	practiceSessionId: string,
	timeUpAction: "stop"
): Promise<boolean> {
	const result = await updateOwnedPracticeSession(userId, practiceSessionId, { timeUpAction });
	return result.meta.changes > 0;
}

export async function deleteOwnedPracticeSession(
	userId: string,
	practiceSessionId: string
): Promise<boolean> {
	const result = await getDatabase()
		.delete(practiceSessions)
		.where(and(eq(practiceSessions.id, practiceSessionId), eq(practiceSessions.userId, userId)));
	return result.meta.changes > 0;
}

/** Context for the AI tutor: task, evaluation, and the last 10 chat messages. */
export function findAiChatContext(userId: string, practiceSessionId: string) {
	return getDatabase().query.practiceSessions.findFirst({
		columns: { id: true, response: true },
		where: {
			id: practiceSessionId,
			userId,
			deletedAt: { isNull: true }
		},
		with: {
			task: { columns: { category: true, prompt: true, imageName: true } },
			evaluation: { columns: { result: true } },
			chatMessages: {
				columns: { from: true, message: true },
				orderBy: (_chatMessages, { desc }) => desc(sql`rowid`),
				limit: 10
			}
		}
	});
}

/** Context for the AI grader: task and response of an active session. */
export function findAiEvaluateContext(userId: string, practiceSessionId: string) {
	return getDatabase().query.practiceSessions.findFirst({
		columns: { id: true, response: true },
		where: {
			id: practiceSessionId,
			userId,
			deletedAt: { isNull: true }
		},
		with: {
			task: { columns: { category: true, prompt: true, imageName: true } }
		}
	});
}

/** The user's most recently touched practice sessions with their overall band. */
export async function listRecentPracticeSessionSummaries(userId: string, limit: number) {
	const rows = await getDatabase().query.practiceSessions.findMany({
		columns: { id: true, name: true, updatedAt: true },
		where: { userId },
		with: {
			task: { columns: { category: true } },
			evaluation: { columns: { result: true } }
		},
		orderBy: (practiceSessions, { desc }) => desc(practiceSessions.updatedAt),
		limit
	});
	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		category: row.task.category,
		updatedAt: row.updatedAt,
		estimatedBand: row.evaluation?.result.estimatedBand
	}));
}

/** Average band per criterion, split by task category. */
export async function getLearnerCriteriaAverages(userId: string) {
	const [stats] = await getDatabase()
		.select({
			task1: {
				ta: sql<number>`coalesce(avg(case when ${tasks.category} = '1' then ${evaluations.result} ->> '$.criteria.taskAchievement.band' end), 0)`,
				cc: sql<number>`coalesce(avg(case when ${tasks.category} = '1' then ${evaluations.result} ->> '$.criteria.coherenceAndCohesion.band' end), 0)`,
				lr: sql<number>`coalesce(avg(case when ${tasks.category} = '1' then ${evaluations.result} ->> '$.criteria.lexicalResource.band' end), 0)`,
				gra: sql<number>`coalesce(avg(case when ${tasks.category} = '1' then ${evaluations.result} ->> '$.criteria.grammaticalRangeAndAccuracy.band' end), 0)`,
				estimatedBand: sql<
					number | null
				>`avg(case when ${tasks.category} = '1' then ${evaluations.result} ->> '$.estimatedBand' end)`
			},
			task2: {
				tr: sql<number>`coalesce(avg(case when ${tasks.category} = '2' then ${evaluations.result} ->> '$.criteria.taskResponse.band' end), 0)`,
				cc: sql<number>`coalesce(avg(case when ${tasks.category} = '2' then ${evaluations.result} ->> '$.criteria.coherenceAndCohesion.band' end), 0)`,
				lr: sql<number>`coalesce(avg(case when ${tasks.category} = '2' then ${evaluations.result} ->> '$.criteria.lexicalResource.band' end), 0)`,
				gra: sql<number>`coalesce(avg(case when ${tasks.category} = '2' then ${evaluations.result} ->> '$.criteria.grammaticalRangeAndAccuracy.band' end), 0)`,
				estimatedBand: sql<
					number | null
				>`avg(case when ${tasks.category} = '2' then ${evaluations.result} ->> '$.estimatedBand' end)`
			}
		})
		.from(practiceSessions)
		.innerJoin(evaluations, eq(practiceSessions.id, evaluations.practiceSessionId))
		.innerJoin(tasks, eq(tasks.id, practiceSessions.taskId))
		.where(eq(practiceSessions.userId, userId));

	return {
		task1: {
			ta: stats?.task1.ta ?? 0,
			cc: stats?.task1.cc ?? 0,
			lr: stats?.task1.lr ?? 0,
			gra: stats?.task1.gra ?? 0,
			estimatedBand: stats?.task1.estimatedBand ?? null
		},
		task2: {
			tr: stats?.task2.tr ?? 0,
			cc: stats?.task2.cc ?? 0,
			lr: stats?.task2.lr ?? 0,
			gra: stats?.task2.gra ?? 0,
			estimatedBand: stats?.task2.estimatedBand ?? null
		}
	};
}

/** Lifetime totals for the dashboard activity card. */
export async function getLearnerActivitySummary(userId: string, weekStartMs: number) {
	const [activity] = await getDatabase()
		.select({
			totalSessions: sql<number>`count(*)`,
			sessionsThisWeek: sql<number>`count(case when "practice_sessions"."started_at" >= ${weekStartMs} then 1 end)`,
			evaluated: sql<number>`count("evaluations"."id")`,
			totalWords: sql<number>`coalesce(sum(case when trim("practice_sessions"."response") = '' then 0 else length(trim(replace(replace(replace("practice_sessions"."response", char(13), ' '), char(10), ' '), char(9), ' '))) - length(replace(trim(replace(replace(replace("practice_sessions"."response", char(13), ' '), char(10), ' '), char(9), ' ')), ' ', '')) + 1 end), 0)`
		})
		.from(practiceSessions)
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.userId, userId));

	return {
		totalSessions: activity?.totalSessions ?? 0,
		sessionsThisWeek: activity?.sessionsThisWeek ?? 0,
		evaluated: activity?.evaluated ?? 0,
		totalWords: activity?.totalWords ?? 0
	};
}

/** Distinct UTC practice days, newest first, capped for the streak calculation. */
export async function listLearnerPracticeDays(userId: string, limit: number): Promise<string[]> {
	const rows = await getDatabase()
		.selectDistinct({
			day: sql<string>`date("practice_sessions"."started_at" / 1000, 'unixepoch')`
		})
		.from(practiceSessions)
		.where(eq(practiceSessions.userId, userId))
		.orderBy(desc(sql`date("practice_sessions"."started_at" / 1000, 'unixepoch')`))
		.limit(limit);
	return rows.map((row) => row.day);
}

/** Overall bands of the most recent evaluated sessions, oldest first. */
export async function listLearnerOverallBands(userId: string, limit: number): Promise<number[]> {
	const rows = await getDatabase()
		.select({ band: sql<number>`json_extract("evaluations"."result", '$.estimatedBand')` })
		.from(practiceSessions)
		.innerJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.userId, userId))
		.orderBy(desc(practiceSessions.startedAt))
		.limit(limit);
	return rows.map((row) => row.band).reverse();
}

export type LearnerHistoryFilters = {
	q: string;
	task: TaskCategory | null;
	subcategory: TaskSubcategory<TaskCategory> | null;
	type: PracticeType | null;
	status: "evaluated" | "unevaluated" | null;
	includeBody: boolean;
	sort: "recent" | "oldest" | "band" | "words";
};

function learnerHistoryConditions(userId: string, filters: LearnerHistoryFilters) {
	const conditions = [eq(practiceSessions.userId, userId)];
	if (filters.task) conditions.push(eq(tasks.category, filters.task));
	if (filters.subcategory) conditions.push(eq(tasks.subcategory, filters.subcategory));
	if (filters.type) conditions.push(eq(practiceSessions.type, filters.type));
	if (filters.status === "evaluated") conditions.push(isNotNull(evaluations.id));
	if (filters.status === "unevaluated") conditions.push(isNull(evaluations.id));
	if (filters.q) {
		const pattern = `%${filters.q}%`;
		const textMatches = [
			like(practiceSessions.name, pattern),
			like(practiceSessions.type, pattern),
			like(tasks.prompt, pattern)
		];
		if (filters.includeBody) {
			textMatches.push(like(practiceSessions.response, pattern));
		}
		conditions.push(or(...textMatches)!);
	}
	return and(...conditions)!;
}

export async function countLearnerHistorySessions(userId: string, filters: LearnerHistoryFilters) {
	const [row] = await getDatabase()
		.select({ total: sql<number>`count(*)` })
		.from(practiceSessions)
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(learnerHistoryConditions(userId, filters));
	return row?.total ?? 0;
}

export function listLearnerHistorySessions(
	userId: string,
	filters: LearnerHistoryFilters,
	paging: { page: number; perPage: number }
) {
	const normalizedResponse = normalizedResponseSql();
	const wordCount = sql`(length(trim(${normalizedResponse})) - length(replace(trim(${normalizedResponse}), ' ', '')) + 1)`;
	const orderBy = {
		recent: [desc(practiceSessions.updatedAt)],
		oldest: [asc(practiceSessions.updatedAt)],
		band: [desc(evaluatedBand)],
		words: [desc(wordCount)]
	}[filters.sort];

	return getDatabase()
		.select({
			id: practiceSessions.id,
			name: practiceSessions.name,
			type: practiceSessions.type,
			updatedAt: practiceSessions.updatedAt,
			response: practiceSessions.response,
			taskCategory: tasks.category,
			taskSubcategory: tasks.subcategory,
			taskPrompt: tasks.prompt,
			evaluationResult: evaluations.result
		})
		.from(practiceSessions)
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(learnerHistoryConditions(userId, filters))
		.orderBy(...orderBy)
		.limit(paging.perPage)
		.offset((paging.page - 1) * paging.perPage);
}

export async function countLearnerSessions(userId: string) {
	const [row] = await getDatabase()
		.select({ total: count() })
		.from(practiceSessions)
		.where(eq(practiceSessions.userId, userId));
	return row?.total ?? 0;
}

/** Overall bands of the most recent evaluated sessions with their start date, oldest first. */
export async function getLearnerHistoryTrend(userId: string, limit: number) {
	const rows = await getDatabase()
		.select({
			band: sql<number>`json_extract("evaluations"."result", '$.estimatedBand')`,
			startedAt: practiceSessions.startedAt
		})
		.from(practiceSessions)
		.innerJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.userId, userId))
		.orderBy(desc(practiceSessions.startedAt))
		.limit(limit);
	return rows.map((row) => ({ band: row.band, date: row.startedAt })).reverse();
}

/** Evaluated-count, average and best band per task category. */
export async function getLearnerCategoryBandStats(userId: string) {
	const rows = await getDatabase()
		.select({
			category: tasks.category,
			evaluated: sql<number>`count(${evaluatedBand})`,
			average: sql<number | null>`avg(${evaluatedBand})`,
			best: sql<number | null>`max(${evaluatedBand})`
		})
		.from(practiceSessions)
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.userId, userId))
		.groupBy(tasks.category);

	const statsFor = (category: TaskCategory) => {
		const row = rows.find((item) => item.category === category);
		return {
			evaluated: row?.evaluated ?? 0,
			average: row?.average ?? 0,
			best: row?.best ?? 0
		};
	};

	return { task1: statsFor("1"), task2: statsFor("2") };
}

export type AdminSessionFilters = {
	page: number;
	pageSize: number;
	search: string;
	category: "all" | TaskCategory;
	type: "all" | PracticeType;
	evaluation: "all" | "evaluated" | "unevaluated";
	days: "all" | "7" | "30" | "90";
};

function adminSessionConditions(filters: AdminSessionFilters) {
	const conditions = [isNull(practiceSessions.deletedAt)];
	if (filters.category !== "all") conditions.push(eq(tasks.category, filters.category));
	if (filters.type !== "all") conditions.push(eq(practiceSessions.type, filters.type));
	if (filters.evaluation === "evaluated") conditions.push(sql`${evaluations.id} IS NOT NULL`);
	if (filters.evaluation === "unevaluated") conditions.push(isNull(evaluations.id));
	if (filters.days !== "all") {
		conditions.push(
			gte(practiceSessions.startedAt, new Date(Date.now() - Number(filters.days) * 86_400_000))
		);
	}
	if (filters.search) {
		const pattern = `%${filters.search}%`;
		conditions.push(
			or(
				like(practiceSessions.name, pattern),
				like(users.name, pattern),
				like(users.email, pattern),
				like(tasks.prompt, pattern)
			)!
		);
	}
	return conditions.length ? and(...conditions) : undefined;
}

export async function countAdminSessions(filters: AdminSessionFilters) {
	const base = getDatabase()
		.select({ total: count() })
		.from(practiceSessions)
		.innerJoin(users, eq(practiceSessions.userId, users.id))
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id));
	const where = adminSessionConditions(filters);
	const [row] = where ? await base.where(where) : await base;
	return row?.total ?? 0;
}

export function listAdminSessions(filters: AdminSessionFilters) {
	return getDatabase()
		.select({
			id: practiceSessions.id,
			name: practiceSessions.name,
			type: practiceSessions.type,
			startedAt: practiceSessions.startedAt,
			updatedAt: practiceSessions.updatedAt,
			category: tasks.category,
			prompt: tasks.prompt,
			ownerId: users.id,
			ownerName: users.name,
			ownerEmail: users.email,
			evaluated: sql<boolean>`${evaluations.id} IS NOT NULL`,
			band: sql<number | null>`json_extract(${evaluations.result}, '$.estimatedBand')`
		})
		.from(practiceSessions)
		.innerJoin(users, eq(practiceSessions.userId, users.id))
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(adminSessionConditions(filters))
		.orderBy(sql`${practiceSessions.startedAt} DESC`)
		.limit(filters.pageSize)
		.offset((filters.page - 1) * filters.pageSize);
}

export function findAdminSessionDetail(practiceSessionId: string) {
	return getDatabase()
		.select({
			id: practiceSessions.id,
			taskId: practiceSessions.taskId,
			name: practiceSessions.name,
			type: practiceSessions.type,
			response: practiceSessions.response,
			startedAt: practiceSessions.startedAt,
			updatedAt: practiceSessions.updatedAt,
			category: tasks.category,
			subcategory: tasks.subcategory,
			prompt: tasks.prompt,
			image: tasks.imageName,
			ownerId: users.id,
			ownerName: users.name,
			ownerEmail: users.email,
			evaluation: evaluations.result
		})
		.from(practiceSessions)
		.innerJoin(users, eq(practiceSessions.userId, users.id))
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.id, practiceSessionId))
		.limit(1);
}

export function deletePracticeSessionById(practiceSessionId: string) {
	return getDatabase().delete(practiceSessions).where(eq(practiceSessions.id, practiceSessionId));
}

export async function countPracticeSessionsInRange(from: Date) {
	const [row] = await getDatabase()
		.select({ total: count() })
		.from(practiceSessions)
		.where(and(isNull(practiceSessions.deletedAt), gte(practiceSessions.startedAt, from)));
	return row?.total ?? 0;
}

export async function countActiveUsersInRange(from: Date) {
	const [row] = await getDatabase()
		.select({ activeUsers: sql<number>`count(distinct ${practiceSessions.userId})` })
		.from(practiceSessions)
		.where(and(isNull(practiceSessions.deletedAt), gte(practiceSessions.updatedAt, from)));
	return row?.activeUsers ?? 0;
}

/** Practice sessions grouped by UTC day, ascending. */
export async function getSessionDayTrend(from: Date) {
	return getDatabase()
		.select({
			day: sql<string>`date(${practiceSessions.startedAt} / 1000, 'unixepoch')`,
			total: count()
		})
		.from(practiceSessions)
		.where(and(isNull(practiceSessions.deletedAt), gte(practiceSessions.startedAt, from)))
		.groupBy(sql`date(${practiceSessions.startedAt} / 1000, 'unixepoch')`)
		.orderBy(asc(sql`date(${practiceSessions.startedAt} / 1000, 'unixepoch')`));
}

/** Practice sessions per UTC day within [start, endExclusive). */
export async function getSessionDayCounts(start: Date, endExclusiveMs: number) {
	return getDatabase()
		.select({
			day: sql<string>`date(${practiceSessions.startedAt} / 1000, 'unixepoch')`,
			sessions: count()
		})
		.from(practiceSessions)
		.where(
			and(
				isNull(practiceSessions.deletedAt),
				gte(practiceSessions.startedAt, start),
				sql`${practiceSessions.startedAt} < ${endExclusiveMs}`
			)
		)
		.groupBy(sql`date(${practiceSessions.startedAt} / 1000, 'unixepoch')`);
}
