import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { getDb } from "#lib/server/db/index.ts";
import type { PageServerLoad } from "./$types";
import type { ChatMessage } from "#lib/schemas/chat-message.ts";
import { getPageSession } from "#lib/server/auth/index.ts";
import { timeLimitMinutesFor } from "#lib/utils/ielts.ts";

export const load = (async ({ locals, params, depends }) => {
	depends("data:practiceSession");

	const { practiceSessionId } = params;

	const { user } = getPageSession(locals);

	const db = getDb(env.IELTS_WRITING_DB);
	const practiceSession = await db.query.practiceSessions.findFirst({
		where: (practices, { eq }) => eq(practices.id, practiceSessionId),
		with: { task: true, evaluation: true, chatMessages: true }
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
		title: practiceSession.name,
		task: {
			id: practiceSession.task.id,
			category: category,
			isOwner: practiceSession.task.userId === user.id,
			prompt: practiceSession.task.prompt,
			image: taskImage,
			imageName: practiceSession.task.image,
			subcategory: practiceSession.task.subcategory
		},
		response: practiceSession.response,
		evaluation: practiceSession.evaluation?.result,
		chatMessages: practiceSession.chatMessages.map(
			(m) => ({ from: m.from, message: m.message }) satisfies ChatMessage
		),
		endAt: timeLimitMinutesFor(category) + Math.floor(practiceSession.startedAt.getTime() / 1000),
		timedUpAction: practiceSession.timeUpAction
	};
}) satisfies PageServerLoad;
