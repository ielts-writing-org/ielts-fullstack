import { getRequestEvent } from "$app/server";
import type { PageServerLoad } from "./$types";
import { combineWritingBands, roundToNearestHalfBand } from "#lib/domain/evaluation.ts";
import { computePracticeStreak } from "#lib/domain/practice-session.ts";
import { getPageSession } from "#lib/server/auth/session.ts";
import {
	getLearnerActivitySummary,
	getLearnerCriteriaAverages,
	listLearnerOverallBands,
	listLearnerPracticeDays,
	listRecentPracticeSessionSummaries
} from "#lib/server/data/practice-sessions.ts";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

	const [practices, criteriaAverages, activity, practiceDays, bandTrend] = await Promise.all([
		listRecentPracticeSessionSummaries(user.id, 4),
		getLearnerCriteriaAverages(user.id),
		getLearnerActivitySummary(user.id, Date.now() - WEEK_MS),
		listLearnerPracticeDays(user.id, 90),
		listLearnerOverallBands(user.id, 8)
	]);

	/**
	 * Nếu người học chưa làm task nào thì điểm trung bình task đó là `null`
	 *
	 * - TH1: Người học chưa làm task nào => overall 0
	 *
	 * - TH2: Người học làm 1 trong 2 task => lấy avg 1 task làm overall
	 *
	 * - TH3: Người học làm cả 2 tasks => tính như công thức
	 */
	const rawOverallBand = combineWritingBands(
		criteriaAverages.task1.estimatedBand,
		criteriaAverages.task2.estimatedBand
	);

	return {
		practiceOptions: PRACTICE_OPTIONS,
		practices: practices.map((p) => ({
			band: p.estimatedBand,
			category: `Task ${p.category}`,
			id: p.id,
			updatedAt: p.updatedAt,
			name: p.name
		})),
		activity,
		streakDays: computePracticeStreak(practiceDays),
		bandTrend,
		statistics: {
			criteria: [
				{
					name: "Task Achievement / Task Response",
					task1: criteriaAverages.task1.ta,
					task2: criteriaAverages.task2.tr
				},
				{
					name: "Coherence & Cohesion",
					task1: criteriaAverages.task1.cc,
					task2: criteriaAverages.task2.cc
				},
				{
					name: "Lexical Resource",
					task1: criteriaAverages.task1.lr,
					task2: criteriaAverages.task2.lr
				},
				{
					name: "Grammar Range & Accuracy",
					task1: criteriaAverages.task1.gra,
					task2: criteriaAverages.task2.gra
				}
			],
			estimatedBand: roundToNearestHalfBand(rawOverallBand)
		}
	};
}) satisfies PageServerLoad;
