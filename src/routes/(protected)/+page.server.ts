import { getSession } from "#lib/server/auth.ts";
import { evaluations, practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getRequestEvent } from "$app/server";
import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { roundToNearestHalf } from "#lib/utils/math.ts";

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
		band: p.evaluation?.result.overallBand,
		category: `Task ${p.task.category}`,
		id: p.id,
		meta: p.updatedAt.toLocaleString(), // Yesterday, 3 days ago
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

	const criteria = [
		{
			name: "Task Achievement / Response",
			scores: [avg[0].tr, avg[1].tr]
		},
		{
			name: "Coherence & Cohesion",
			scores: [avg[0].cc, avg[1].cc]
		},
		{
			name: "Lexical Resource",
			scores: [avg[0].lr, avg[1].lr]
		},
		{
			name: "Grammar Range & Accuracy",
			scores: [avg[0].gra, avg[1].gra]
		}
	];

	const rawOverallBand = (avg[0].overall * 1) / 3 + (avg[1].overall * 2) / 3;
	const roundedOverallBand = roundToNearestHalf(rawOverallBand);

	return {
		criteria: criteria,
		practiceOptions: PRACTICE_OPTIONS,
		practices: recentPracticeSessions,
		overallBand: roundedOverallBand,
		recentPracticeSession: {
			practiceSession: {
				id: practices[0].id,
				name: practices[0].name,
				type: practices[0].type,
				updatedAt: practices[0].updatedAt
			},
			task: {
				category: practices[0].task.category,
				subcategory: practices[0].task.subcategory,
				prompt: practices[0].task.prompt
			}
		}
	};
}) satisfies PageServerLoad;
