import { and, asc, count, eq, gte, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { aiRequests } from "../db/app.schema";
import { users } from "../db/auth.schema";
import { getDatabase } from "../db/index.ts";

export type AiRequestKind = "grading" | "chat";

/**
 * One INSERT..SELECT both checks the daily cap and reserves the attempt
 * atomically. Returns `null` when the daily quota for `kind` is exhausted.
 */
export async function reserveAiRequest(
	userId: string,
	practiceSessionId: string,
	kind: AiRequestKind,
	model: string,
	limit: number
): Promise<{ id: string; startedAt: number } | null> {
	const startedAt = Date.now();
	const dayStart = new Date();
	dayStart.setUTCHours(0, 0, 0, 0);
	const id = uuidv7();
	const result = await getDatabase().run(sql`
		INSERT INTO ai_requests (id, user_id, practice_session_id, kind, status, model, started_at, created_at, updated_at)
		SELECT ${id}, ${userId}, ${practiceSessionId}, ${kind}, 'pending', ${model}, ${startedAt}, ${startedAt}, ${startedAt}
		WHERE ${limit} = 0 OR (
			SELECT count(*) FROM ai_requests
			WHERE user_id = ${userId} AND kind = ${kind} AND started_at >= ${dayStart.getTime()}
		) < ${limit}
	`);
	if (result.meta.changes !== 1) return null;
	return { id, startedAt };
}

export async function completeAiRequest(
	requestId: string,
	startedAt: number,
	data: {
		status: "success" | "error";
		inputTokens: number | null;
		outputTokens: number | null;
		errorSummary: string | null;
	}
) {
	await getDatabase().run(sql`
		UPDATE ai_requests SET status = ${data.status}, completed_at = ${Date.now()},
			duration_ms = ${Date.now() - startedAt}, input_tokens = ${data.inputTokens},
			output_tokens = ${data.outputTokens}, error_summary = ${data.errorSummary},
			updated_at = ${Date.now()}
		WHERE id = ${requestId}
	`);
}

/** Records a failed attempt before any provider stream exists. */
export async function failAiRequest(requestId: string, startedAt: number, summary: string) {
	try {
		await completeAiRequest(requestId, startedAt, {
			status: "error",
			inputTokens: null,
			outputTokens: null,
			errorSummary: summary.slice(0, 240)
		});
	} catch (cause) {
		console.error("AI telemetry update failed", cause instanceof Error ? cause.name : "unknown");
	}
}

export type AiRequestFilters = {
	page: number;
	pageSize: number;
	kind: "all" | AiRequestKind;
	status: "all" | "pending" | "success" | "error";
	model: string;
	days: "7" | "30" | "90" | "365";
};

function aiRequestConditions(filters: AiRequestFilters) {
	const conditions = [
		gte(aiRequests.startedAt, new Date(Date.now() - Number(filters.days) * 86_400_000))
	];
	if (filters.kind !== "all") conditions.push(eq(aiRequests.kind, filters.kind));
	if (filters.status !== "all") conditions.push(eq(aiRequests.status, filters.status));
	if (filters.model) conditions.push(eq(aiRequests.model, filters.model));
	return and(...conditions);
}

export async function countAiRequests(filters: AiRequestFilters) {
	const [row] = await getDatabase()
		.select({ total: count() })
		.from(aiRequests)
		.where(aiRequestConditions(filters));
	return row?.total ?? 0;
}

export function listAiRequests(filters: AiRequestFilters) {
	return getDatabase()
		.select({
			id: aiRequests.id,
			kind: aiRequests.kind,
			status: aiRequests.status,
			model: aiRequests.model,
			startedAt: aiRequests.startedAt,
			durationMs: aiRequests.durationMs,
			inputTokens: aiRequests.inputTokens,
			outputTokens: aiRequests.outputTokens,
			errorSummary: aiRequests.errorSummary,
			userName: users.name,
			userEmail: users.email,
			practiceSessionId: aiRequests.practiceSessionId
		})
		.from(aiRequests)
		.leftJoin(users, eq(aiRequests.userId, users.id))
		.where(aiRequestConditions(filters))
		.orderBy(sql`${aiRequests.startedAt} DESC`)
		.limit(filters.pageSize)
		.offset((filters.page - 1) * filters.pageSize);
}

/** Aggregate success/error/latency/token totals since `from`. */
export async function getAiRequestSummary(from: Date) {
	const [row] = await getDatabase()
		.select({
			total: count(),
			requestsError: sql<number>`coalesce(sum(case when ${aiRequests.status} = 'error' then 1 else 0 end), 0)`,
			requestsSuccess: sql<number>`coalesce(sum(case when ${aiRequests.status} = 'success' then 1 else 0 end), 0)`,
			averageLatencyMs: sql<number | null>`avg(${aiRequests.durationMs})`,
			inputTokens: sql<number>`coalesce(sum(${aiRequests.inputTokens}), 0)`,
			outputTokens: sql<number>`coalesce(sum(${aiRequests.outputTokens}), 0)`
		})
		.from(aiRequests)
		.where(gte(aiRequests.startedAt, from));

	return {
		total: row?.total ?? 0,
		requestsError: row?.requestsError ?? 0,
		requestsSuccess: row?.requestsSuccess ?? 0,
		averageLatencyMs: row?.averageLatencyMs ?? null,
		inputTokens: row?.inputTokens ?? 0,
		outputTokens: row?.outputTokens ?? 0
	};
}

export async function getAiRequestKindTotals(from: Date) {
	const rows = await getDatabase()
		.select({ kind: aiRequests.kind, total: count() })
		.from(aiRequests)
		.where(gte(aiRequests.startedAt, from))
		.groupBy(aiRequests.kind);
	const kindTotals = { grading: 0, chat: 0 };
	for (const row of rows) kindTotals[row.kind] = row.total;
	return kindTotals;
}

/** AI requests grouped by UTC day, ascending. */
export async function getAiRequestDayTrend(from: Date) {
	return getDatabase()
		.select({
			day: sql<string>`date(${aiRequests.startedAt} / 1000, 'unixepoch')`,
			requests: count(),
			inputTokens: sql<number>`coalesce(sum(${aiRequests.inputTokens}), 0)`,
			outputTokens: sql<number>`coalesce(sum(${aiRequests.outputTokens}), 0)`,
			errors: sql<number>`coalesce(sum(case when ${aiRequests.status} = 'error' then 1 else 0 end), 0)`
		})
		.from(aiRequests)
		.where(gte(aiRequests.startedAt, from))
		.groupBy(sql`date(${aiRequests.startedAt} / 1000, 'unixepoch')`)
		.orderBy(asc(sql`date(${aiRequests.startedAt} / 1000, 'unixepoch')`));
}

/** AI requests per UTC day within [start, endExclusive), split by kind. */
export async function getAiRequestDayCounts(start: Date, endExclusiveMs: number) {
	return getDatabase()
		.select({
			day: sql<string>`date(${aiRequests.startedAt} / 1000, 'unixepoch')`,
			requests: count(),
			grading: sql<number>`sum(case when ${aiRequests.kind} = 'grading' then 1 else 0 end)`,
			chat: sql<number>`sum(case when ${aiRequests.kind} = 'chat' then 1 else 0 end)`,
			errors: sql<number>`sum(case when ${aiRequests.status} = 'error' then 1 else 0 end)`,
			inputTokens: sql<number>`coalesce(sum(${aiRequests.inputTokens}), 0)`,
			outputTokens: sql<number>`coalesce(sum(${aiRequests.outputTokens}), 0)`
		})
		.from(aiRequests)
		.where(and(gte(aiRequests.startedAt, start), sql`${aiRequests.startedAt} < ${endExclusiveMs}`))
		.groupBy(sql`date(${aiRequests.startedAt} / 1000, 'unixepoch')`);
}
