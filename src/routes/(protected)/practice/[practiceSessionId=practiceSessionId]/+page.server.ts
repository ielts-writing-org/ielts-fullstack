import { error } from "@sveltejs/kit";
import { getDatabase } from "#lib/server/db/index.ts";
import type { PageServerLoad } from "./$types";
import type { ChatMessage } from "#lib/domain/chat-message.ts";
import { getPageSession } from "#lib/server/auth/session.ts";
import { getTimeLimitInMinutes } from "#lib/utils/ielts.ts";

export const load = (async ({ locals, params, depends }) => {
	depends("data:practiceSession");

	const { practiceSessionId } = params;
	const { user } = getPageSession(locals);

	const db = getDatabase();
	const practiceSession = await db.query.practiceSessions.findFirst({
		where: (practices, { and, eq }) =>
			and(eq(practices.id, practiceSessionId), eq(practices.userId, user.id)),
		with: { task: true, evaluation: true, chatMessages: true }
	});

	if (!practiceSession) {
		error(404);
	}

	const category = practiceSession.task.category;

	return {
		type: practiceSession.type,
		title: practiceSession.name,
		task: {
			id: practiceSession.task.id,
			category: category,
			isOwner: practiceSession.task.userId === user.id,
			prompt: practiceSession.task.prompt,
			imageName: practiceSession.task.imageName,
			subcategory: practiceSession.task.subcategory
		},
		response: practiceSession.response,
		evaluation: practiceSession.evaluation?.result,
		chatMessages: practiceSession.chatMessages.map(
			(m) => ({ from: m.from, message: m.message }) satisfies ChatMessage
		),
		endAt: getTimeLimitInMinutes(category) + Math.floor(practiceSession.startedAt.getTime() / 1000),
		timedUpAction: practiceSession.timeUpAction,
		metadata: {
			title: practiceSession.name,
			taskCategory: category,
			taskSubcategory: practiceSession.task.subcategory
		}
	};
}) satisfies PageServerLoad;
