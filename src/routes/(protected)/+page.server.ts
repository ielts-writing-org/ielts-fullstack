import { evaluations, practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getRequestEvent } from "$app/server";
import { env } from "cloudflare:workers";
import { desc, eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { roundToNearestHalf } from "#lib/utils/math.ts";
import { formatRelativeTime } from "#lib/utils/time.ts";
import { getPageSession } from "#lib/server/auth/index.ts";

const PRACTICE_OPTIONS = [
	{
		taskCategory: "1" as const,
		name: "Academic Visual Report",
		description: "Summarize, describe, or explain visual data. Present an overview.",
		requirements: "20 mins • min 150 words",
		supportLabel: "Supported Visual Types:",
		supportTypes: [
			"Line Graph",
			"Bar Chart",
			"Pie Chart",
			"Table",
			"Process Diagram",
			"Map",
			"Multiple Visuals"
		]
	},
	{
		taskCategory: "2" as const,
		name: "Academic Discursive Essay",
		description: "Write a formal academic essay presenting structured arguments.",
		requirements: "40 mins • min 250 words",
		supportLabel: "Supported Question Types:",
		supportTypes: [
			"Opinion (Agree/Disagree)",
			"Discussion (Both Views)",
			"Advantages & Disadvantages",
			"Problems & Solutions",
			"Two-Part Direct Questions"
		]
	}
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Counts consecutive practice days ending today or yesterday, from ISO day strings. */
function computeStreak(days: string[]): number {
	if (days.length === 0) {
		return 0;
	}

	const daySet = new Set(days);
	const dayKey = (date: Date) => date.toISOString().slice(0, 10);
	const cursor = new Date();

	if (!daySet.has(dayKey(cursor))) {
		cursor.setUTCDate(cursor.getUTCDate() - 1);
		if (!daySet.has(dayKey(cursor))) {
			return 0;
		}
	}

	let streak = 0;
	while (daySet.has(dayKey(cursor))) {
		streak++;
		cursor.setUTCDate(cursor.getUTCDate() - 1);
	}
	return streak;
}

export const load = (async () => {
	const { locals } = getRequestEvent();
	const { user } = getPageSession(locals);

	const db = getDb(env.IELTS_WRITING_DB);
	const practices = await db.query.practiceSessions.findMany({
		limit: 4,
		orderBy: (practiceSessions, { desc }) => [desc(practiceSessions.updatedAt)],
		where: (practiceSessions, { eq }) => eq(practiceSessions.userId, user.id),
		with: {
			task: true,
			evaluation: true
		}
	});

	// Statistics
	// prettier-ignore
	const [stats] = await db
	.select({
		task1: {
			ta: sql<number>`coalesce(avg(case when ${tasks.category} = '1' then ${evaluations.result} ->> '$.criteria.taskAchievement.band' end), 0)`,
			cc: sql<number>`coalesce(avg(case when ${tasks.category} = '1' then ${evaluations.result} ->> '$.criteria.coherenceAndCohesion.band' end), 0)`,
			lr: sql<number>`coalesce(avg(case when ${tasks.category} = '1' then ${evaluations.result} ->> '$.criteria.lexicalResource.band' end), 0)`,
			gra: sql<number>`coalesce(avg(case when ${tasks.category} = '1' then ${evaluations.result} ->> '$.criteria.grammaticalRangeAndAccuracy.band' end), 0)`,
			estimatedBand: sql<number>`coalesce(avg(case when ${tasks.category} = '1' then ${evaluations.result} ->> '$.estimatedBand' end), 0)`
		},
		task2: {
			tr: sql<number>`coalesce(avg(case when ${tasks.category} = '2' then ${evaluations.result} ->> '$.criteria.taskResponse.band' end), 0)`,
			cc: sql<number>`coalesce(avg(case when ${tasks.category} = '2' then ${evaluations.result} ->> '$.criteria.coherenceAndCohesion.band' end), 0)`,
			lr: sql<number>`coalesce(avg(case when ${tasks.category} = '2' then ${evaluations.result} ->> '$.criteria.lexicalResource.band' end), 0)`,
			gra: sql<number>`coalesce(avg(case when ${tasks.category} = '2' then ${evaluations.result} ->> '$.criteria.grammaticalRangeAndAccuracy.band' end), 0)`,
			estimatedBand: sql<number>`coalesce(avg(case when ${tasks.category} = '2' then ${evaluations.result} ->> '$.estimatedBand' end), 0)`
		}
	})
	.from(practiceSessions)
	.innerJoin(evaluations, eq(practiceSessions.id, evaluations.practiceSessionId))
	.innerJoin(tasks, eq(tasks.id, practiceSessions.taskId))
	.where(eq(practiceSessions.userId, user.id));

	const rawOverallBand = (stats.task1.estimatedBand * 1) / 3 + (stats.task2.estimatedBand * 2) / 3;

	// Activity aggregates: totals across all sessions, plus evaluations count
	// for the progress card's empty state.
	const weekStart = Date.now() - WEEK_MS;
	const [activity] = await db
		.select({
			totalSessions: sql<number>`count(*)`,
			sessionsThisWeek: sql<number>`count(case when "practice_sessions"."started_at" >= ${weekStart} then 1 end)`,
			evaluated: sql<number>`count("evaluations"."id")`,
			totalWords: sql<number>`coalesce(sum(case when trim("practice_sessions"."response") = '' then 0 else length(trim(replace(replace(replace("practice_sessions"."response", char(13), ' '), char(10), ' '), char(9), ' '))) - length(replace(trim(replace(replace(replace("practice_sessions"."response", char(13), ' '), char(10), ' '), char(9), ' ')), ' ', '')) + 1 end), 0)`
		})
		.from(practiceSessions)
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.userId, user.id));

	// Distinct practice days (UTC) for the streak, newest first, capped at 90.
	const dayRows = await db
		.selectDistinct({
			day: sql<string>`date("practice_sessions"."started_at" / 1000, 'unixepoch')`
		})
		.from(practiceSessions)
		.where(eq(practiceSessions.userId, user.id))
		.orderBy(desc(sql`date("practice_sessions"."started_at" / 1000, 'unixepoch')`))
		.limit(90);

	// Overall bands of the most recent evaluated sessions, chronological order.
	const bandRows = await db
		.select({ band: sql<number>`json_extract("evaluations"."result", '$.estimatedBand')` })
		.from(practiceSessions)
		.innerJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.userId, user.id))
		.orderBy(desc(practiceSessions.startedAt))
		.limit(8);

	return {
		practiceOptions: PRACTICE_OPTIONS,
		practices: practices.map((p) => ({
			band: p.evaluation?.result.estimatedBand,
			category: `Task ${p.task.category}`,
			id: p.id,
			meta: formatRelativeTime(p.updatedAt),
			name: p.name
		})),
		activity: {
			totalWords: activity?.totalWords ?? 0,
			sessionsThisWeek: activity?.sessionsThisWeek ?? 0,
			totalSessions: activity?.totalSessions ?? 0,
			evaluated: activity?.evaluated ?? 0
		},
		streakDays: computeStreak(dayRows.map((row) => row.day)),
		bandTrend: bandRows.map((row) => row.band).reverse(),
		statistics: {
			criteria: [
				{
					name: "Task Achievement / Response",
					task1: stats.task1.ta,
					task2: stats.task2.tr
				},
				{
					name: "Coherence & Cohesion",
					task1: stats.task1.cc,
					task2: stats.task2.cc
				},
				{
					name: "Lexical Resource",
					task1: stats.task1.lr,
					task2: stats.task2.lr
				},
				{
					name: "Grammar Range & Accuracy",
					task1: stats.task1.gra,
					task2: stats.task2.gra
				}
			],
			estimatedBand: roundToNearestHalf(rawOverallBand)
		}
	};
}) satisfies PageServerLoad;
