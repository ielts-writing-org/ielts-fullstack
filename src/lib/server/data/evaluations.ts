import { and, asc, count, gte, isNotNull, isNull, sql } from "drizzle-orm";
import type { Evaluation } from "#lib/domain/evaluation.ts";
import { evaluations } from "../db/app.schema";
import { getDatabase } from "../db/index.ts";

export function upsertEvaluation(practiceSessionId: string, result: Evaluation) {
	return getDatabase()
		.insert(evaluations)
		.values({ practiceSessionId, result })
		.onConflictDoUpdate({
			target: evaluations.practiceSessionId,
			set: { result }
		});
}

export async function countEvaluationsInRange(from: Date) {
	const [row] = await getDatabase()
		.select({ total: count() })
		.from(evaluations)
		.where(and(isNull(evaluations.deletedAt), gte(evaluations.createdAt, from)));
	return row?.total ?? 0;
}

/** Evaluations grouped by UTC day, ascending. */
export async function getEvaluationDayTrend(from: Date) {
	return getDatabase()
		.select({
			day: sql<string>`date(${evaluations.createdAt} / 1000, 'unixepoch')`,
			total: count()
		})
		.from(evaluations)
		.where(and(isNull(evaluations.deletedAt), gte(evaluations.createdAt, from)))
		.groupBy(sql`date(${evaluations.createdAt} / 1000, 'unixepoch')`)
		.orderBy(asc(sql`date(${evaluations.createdAt} / 1000, 'unixepoch')`));
}

/** Evaluations per UTC day within [start, endExclusive). */
export async function getEvaluationDayCounts(start: Date, endExclusiveMs: number) {
	return getDatabase()
		.select({
			day: sql<string>`date(${evaluations.createdAt} / 1000, 'unixepoch')`,
			evaluations: count()
		})
		.from(evaluations)
		.where(
			and(
				isNull(evaluations.deletedAt),
				gte(evaluations.createdAt, start),
				sql`${evaluations.createdAt} < ${endExclusiveMs}`
			)
		)
		.groupBy(sql`date(${evaluations.createdAt} / 1000, 'unixepoch')`);
}

/** Distribution of estimated bands over evaluations in range, ascending by band. */
export async function getBandDistribution(from: Date) {
	const band = sql<number>`json_extract(${evaluations.result}, '$.estimatedBand')`;
	return getDatabase()
		.select({ band, total: count() })
		.from(evaluations)
		.where(and(isNull(evaluations.deletedAt), gte(evaluations.createdAt, from), isNotNull(band)))
		.groupBy(band)
		.orderBy(asc(band));
}
