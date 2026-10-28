import { getSession } from "#lib/server/auth.ts";
import { evaluations, practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getRequestEvent } from "$app/server";
import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { roundToNearestHalf } from "#lib/utils/math.ts";
import { formatRelativeTime } from "#lib/utils/time.ts";

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
	const { user } = getSession(locals);

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

	const recentPracticeSessions = practices.map((p) => ({
		band: p.evaluation?.result.estimatedBand,
		category: `Task ${p.task.category}`,
		id: p.id,
		meta: formatRelativeTime(p.updatedAt),
		name: p.name
	}));

	// Statistics
	const avg = await db
		.select({
			tr: sql`avg(${evaluations.result} ->> '$.criteria.taskResponse.band')`.mapWith(Number),
			cc: sql`avg(${evaluations.result} ->> '$.criteria.coherenceAndCohesion.band')`.mapWith(
				Number
			),
			lr: sql`avg(${evaluations.result} ->> '$.criteria.lexicalResource.band')`.mapWith(Number),
			gra: sql`avg(${evaluations.result} ->> '$.criteria.grammaticalRangeAndAccuracy.band')`.mapWith(
				Number
			),
			overall: sql`avg(${evaluations.result} ->> '$.overallBand')`.mapWith(Number)
		})
		.from(practiceSessions)
		.where(eq(practiceSessions.userId, user.id))
		.innerJoin(evaluations, eq(practiceSessions.id, evaluations.practiceSessionId))
		.innerJoin(tasks, eq(tasks.id, practiceSessions.taskId))
		.groupBy(tasks.category);

	const task1 = avg[0];
	const task2 = avg[1];

	const criteria = [
		{
			name: "Task Achievement / Response",
			scores: [task1?.tr ?? 0, task2?.tr ?? 0]
		},
		{
			name: "Coherence & Cohesion",
			scores: [task1?.cc ?? 0, task2?.cc ?? 0]
		},
		{
			name: "Lexical Resource",
			scores: [task1?.lr ?? 0, task2?.lr ?? 0]
		},
		{
			name: "Grammar Range & Accuracy",
			scores: [task1?.gra ?? 0, task2?.gra ?? 0]
		}
	];

	const rawOverallBand = ((task1?.overall ?? 0) * 1) / 3 + ((task2?.overall ?? 0) * 2) / 3;
	const roundedOverallBand = roundToNearestHalf(rawOverallBand);

	const latest = practices[0];

	return {
		criteria: criteria,
		practiceOptions: PRACTICE_OPTIONS,
		practices: recentPracticeSessions,
		overallBand: roundedOverallBand,
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
			: null
	};
}) satisfies PageServerLoad;
