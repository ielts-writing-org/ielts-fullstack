import { getRequestEvent } from "$app/server";
import { env } from "cloudflare:workers";

import { requireSession } from "#lib/server/auth.ts";
import { getDb } from "#lib/server/db/index.ts";

import type { PageServerLoad } from "./$types";

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

const RECOMMENDED_TASK = {
	category: "Opinion Essay",
	description:
		"Your recent essays demonstrate strong lexical range (Band 7.0), but your arguments need deeper explanation and concrete examples to reach Band 7.5+ in Task Response.",
	est: 40,
	title: "Community Service in High School",
	type: "2" as const
};

const CRITERIA = [
	{
		bar: "w-[73%] bg-[#5a50ea]",
		direction: "up",
		name: "Task Response / Achievement",
		note: "Main idea clear; expand supporting arguments.",
		score: "6.5",
		scoreColor: "text-[#5045eb]"
	},
	{
		bar: "w-[78%] bg-[#8841ea]",
		direction: "steady",
		name: "Coherence & Cohesion",
		note: "Logical paragraphing; diverse linking words.",
		score: "7.0",
		scoreColor: "text-[#5045eb]"
	},
	{
		bar: "w-[78%] bg-[#07966e]",
		direction: "up",
		name: "Lexical Resource",
		note: "Good academic collocations; reduce repetition.",
		score: "7.0",
		scoreColor: "text-[#039b78]"
	},
	{
		bar: "w-[60%] bg-[#e58600]",
		direction: "up",
		name: "Grammar Range & Accuracy",
		note: "Accurate simple sentences; watch comma splices.",
		score: "6.0",
		scoreColor: "text-[#e68500]"
	}
];

export const load = (async () => {
	const { locals } = getRequestEvent();
	const { user } = requireSession(locals);

	const db = getDb(env.IELTS_WRITING_DB);
	const practices = await db.query.practiceSession.findMany({
		limit: 3,
		orderBy: (practiceSessions, { desc }) => [desc(practiceSessions.updatedAt)],
		where: (practiceSessions, { eq }) => eq(practiceSessions.userId, user.id),
		with: {
			task: true
		}
	});

	return {
		criteria: CRITERIA,
		practiceOptions: PRACTICE_OPTIONS,
		practices: practices.map((p) => ({
			band: "N/A",
			category: `Task ${p.task.category}`,
			id: p.id,
			meta: p.updatedAt.toLocaleString(), // Yesterday, 3 days ago
			name: p.name
		})),
		recommendedTask: RECOMMENDED_TASK
	};
}) satisfies PageServerLoad;
