import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { getSession } from "#lib/server/auth.ts";
import { getDb } from "#lib/server/db/index.ts";
import type { PageServerLoad } from "./$types";

const TASK_DURATIONS = {
	"1": 20 * 60, // 20 minutes in seconds
	"2": 40 * 60 // 40 minutes in seconds
} as const;

export const load = (async ({ locals, params, depends }) => {
	depends("data:practiceSession");

	const { practiceSessionId } = params;

	const { user } = getSession(locals);

	const db = getDb(env.IELTS_WRITING_DB);
	const practiceSession = await db.query.practiceSessions.findFirst({
		where: (practices, { eq }) => eq(practices.id, practiceSessionId),
		with: { task: true, evaluation: true }
	});

	if (!practiceSession) {
		error(404, "Practice does not exist");
	}

	const category = practiceSession.task.category;

	let taskImage: string | undefined;
	if (practiceSession.task.image) {
		const image = await env.IELTS_WRITING_BUCKET.get(practiceSession.task.image);
		if (image) {
			const blob = await image.blob();
			const bytes = await blob.bytes();
			taskImage = Buffer.from(bytes).toString("base64");
		}
	}

	return {
		type: practiceSession.type,
		pageName: practiceSession.name,
		pageDescription: `IELTS Writing task ${category}`,
		task: {
			id: practiceSession.task.id,
			category: category,
			isOwner: practiceSession.task.userId === user.id,
			prompt: practiceSession.task.prompt,
			image: taskImage
		},
		response: practiceSession.response,
		evaluation: practiceSession.evaluation?.result,
		endAt: TASK_DURATIONS[category] + Math.floor(practiceSession.startedAt.getTime() / 1000),
		timedUpAction: practiceSession.timeUpAction
	};
}) satisfies PageServerLoad;
