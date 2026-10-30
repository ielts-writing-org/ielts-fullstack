import { getDb } from "#lib/server/db/index.ts";
import { env } from "cloudflare:workers";
import type { PageServerLoad } from "./$types";
import type { Evaluation } from "#lib/schemas/evaluation.ts";
import type { AllTaskSubcategory } from "#lib/schemas/task-subcategory.ts";
import { countWords } from "#lib/utils/stats.ts";
import { chatMessages, evaluations, practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { and, asc, desc, eq, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import { getPageSession } from "#lib/server/auth/index.ts";
import type { Criteria } from "#lib/schemas/criteria.ts";

const PER_PAGE = 5;
const SORTS = ["recent", "oldest", "band", "words"] as const;
const TASK_CATEGORIES = ["1", "2"] as const;
const PRACTICE_TYPES = ["free", "timed"] as const;
const STATUSES = ["evaluated", "unevaluated"] as const;

type Sort = (typeof SORTS)[number];

/**
 * Per-criterion bands keyed by their criterion key.
 *
 * Only one of `taskAchievement` (Task 1) or `taskResponse` (Task 2) is present,
 * so the record is partial. Returns `null` when the session has no evaluation.
 */
function criterionBands(result: Evaluation | undefined): Partial<Record<Criteria, number>> | null {
	if (!result) {
		return null;
	}

	const { coherenceAndCohesion, lexicalResource, grammaticalRangeAndAccuracy } = result.criteria;

	return result.taskCategory === "1"
		? {
				taskAchievement: result.criteria.taskAchievement.band,
				coherenceAndCohesion: coherenceAndCohesion.band,
				lexicalResource: lexicalResource.band,
				grammaticalRangeAndAccuracy: grammaticalRangeAndAccuracy.band
			}
		: {
				taskResponse: result.criteria.taskResponse.band,
				coherenceAndCohesion: coherenceAndCohesion.band,
				lexicalResource: lexicalResource.band,
				grammaticalRangeAndAccuracy: grammaticalRangeAndAccuracy.band
			};
}

export const load = (async ({ locals, url }) => {
	const { user } = getPageSession(locals);
	const db = getDb(env.IELTS_WRITING_DB);

	const searchParams = url.searchParams;
	const q = searchParams.get("q")?.trim() ?? "";
	const task = TASK_CATEGORIES.find((value) => value === searchParams.get("task"));
	const type = PRACTICE_TYPES.find((value) => value === searchParams.get("type"));
	const status = STATUSES.find((value) => value === searchParams.get("status"));
	const subcategory = searchParams.get("subcategory") ?? undefined;
	const sort: Sort = SORTS.find((value) => value === searchParams.get("sort")) ?? "recent";
	const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
	const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

	const conditions = [eq(practiceSessions.userId, user.id)];
	if (task) conditions.push(eq(tasks.category, task));
	if (subcategory) conditions.push(eq(tasks.subcategory, subcategory as AllTaskSubcategory));
	if (type) conditions.push(eq(practiceSessions.type, type));
	if (status === "evaluated") conditions.push(isNotNull(evaluations.id));
	if (status === "unevaluated") conditions.push(isNull(evaluations.id));
	if (q) {
		const pattern = `%${q}%`;
		conditions.push(
			or(
				like(practiceSessions.name, pattern),
				like(practiceSessions.type, pattern),
				like(tasks.prompt, pattern)
			)!
		);
	}
	const where = and(...conditions);

	const [countRow] = await db
		.select({ total: sql<number>`count(*)` })
		.from(practiceSessions)
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(where);

	const total = countRow?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const safePage = Math.min(page, totalPages);

	const estimatedBand = sql`json_extract(${evaluations.result}, '$.estimatedBand')`;
	const normalizedResponse = sql`replace(replace(replace(${practiceSessions.response}, char(13), ' '), char(10), ' '), char(9), ' ')`;
	const wordCount = sql`(length(trim(${normalizedResponse})) - length(replace(trim(${normalizedResponse}), ' ', '')) + 1)`;

	const orderBy = {
		recent: [desc(practiceSessions.updatedAt)],
		oldest: [asc(practiceSessions.updatedAt)],
		band: [desc(estimatedBand)],
		words: [desc(wordCount)]
	}[sort];

	const messageCount = sql<number>`(select count(*) from ${chatMessages} where ${chatMessages.practiceSessionId} = ${practiceSessions.id})`;

	const rows = await db
		.select({
			id: practiceSessions.id,
			name: practiceSessions.name,
			type: practiceSessions.type,
			updatedAt: practiceSessions.updatedAt,
			response: practiceSessions.response,
			taskCategory: tasks.category,
			taskSubcategory: tasks.subcategory,
			taskPrompt: tasks.prompt,
			evaluationResult: evaluations.result,
			messages: messageCount
		})
		.from(practiceSessions)
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(where)
		.orderBy(...orderBy)
		.limit(PER_PAGE)
		.offset((safePage - 1) * PER_PAGE);

	const subcategoryRows = await db
		.selectDistinct({ subcategory: tasks.subcategory })
		.from(practiceSessions)
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.where(eq(practiceSessions.userId, user.id));

	const totalSessions = await db.$count(practiceSessions, eq(practiceSessions.userId, user.id));

	const categoryRows = await db
		.select({
			category: tasks.category,
			evaluated: sql<number>`count(${estimatedBand})`,
			average: sql<number | null>`avg(${estimatedBand})`,
			best: sql<number | null>`max(${estimatedBand})`
		})
		.from(practiceSessions)
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.userId, user.id))
		.groupBy(tasks.category);

	const statsFor = (category: "1" | "2") => {
		const row = categoryRows.find((item) => item.category === category);
		return {
			evaluated: row?.evaluated ?? 0,
			average: row?.average ?? 0,
			best: row?.best ?? 0
		};
	};

	const task1 = statsFor("1");
	const task2 = statsFor("2");

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
				words: countWords(row.response),
				messages: row.messages,
				estimatedBand: result?.estimatedBand,
				criteria: criterionBands(result)
			};
		}),
		availableSubcategories: subcategoryRows
			.map((row) => row.subcategory)
			.filter((value): value is AllTaskSubcategory => value !== null)
			.sort((a, b) => a.localeCompare(b)),
		stats: {
			total: totalSessions,
			evaluated: task1.evaluated + task2.evaluated,
			task1,
			task2
		},
		pagination: { page: safePage, perPage: PER_PAGE, total, totalPages },
		filters: {
			q,
			task: task ?? null,
			subcategory: subcategory ?? null,
			type: type ?? null,
			status: status ?? null,
			sort
		}
	};
}) satisfies PageServerLoad;
