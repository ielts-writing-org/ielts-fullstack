import { evaluations, practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getRequestEvent } from "$app/server";
import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
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

	const latest = practices[0];

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

	return {
		practiceOptions: PRACTICE_OPTIONS,
		practices: practices.map((p) => ({
			band: p.evaluation?.result.estimatedBand,
			category: `Task ${p.task.category}`,
			id: p.id,
			meta: formatRelativeTime(p.updatedAt),
			name: p.name
		})),
		recentPracticeSession: latest
			? {
					practiceSession: {
						id: latest.id,
						name: latest.name,
						type: latest.type,
						updatedAt: latest.updatedAt
					},
					task: {
						category: latest.task.category,
						subcategory: latest.task.subcategory,
						prompt: latest.task.prompt
					}
				}
			: null,
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
