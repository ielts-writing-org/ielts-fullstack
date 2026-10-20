import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { requireSession } from "#lib/server/auth.ts";
import { getDb } from "#lib/server/db/index.ts";
import type { PageServerLoad } from "./$types";

const TASK_DURATIONS = {
	"1": 20 * 60, // 20 minutes in seconds
	"2": 40 * 60 // 40 minutes in seconds
} as const;

export const load = (async ({ locals, params }) => {
	const { practiceSessionId } = params;

	const { user } = requireSession(locals);

	const db = getDb(env.IELTS_WRITING_DB);
	const practiceSession = await db.query.practiceSessions.findFirst({
		where: (practices, { eq }) => eq(practices.id, practiceSessionId),
		with: { task: true }
	});

	if (!practiceSession) {
		error(404, "Practice does not exist");
	}

	const category = practiceSession.task.category;

	return {
		type: practiceSession.type,
		pageName: practiceSession.name,
		pageDescription: `IELTS Writing task ${category}`,
		task: {
			category: category,
			isOwner: practiceSession.task.userId === user.id,
			prompt: practiceSession.task.prompt
		},
		response: practiceSession.response,
		endAt: TASK_DURATIONS[category] + Math.floor(practiceSession.startedAt.getTime() / 1000),
		timedUpAction: practiceSession.timeUpAction
	};
}) satisfies PageServerLoad;
