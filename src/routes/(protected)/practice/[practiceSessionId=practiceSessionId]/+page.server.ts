import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { ChatMessage } from "#lib/domain/chat-message.ts";
import { getPageSession } from "#lib/server/auth/session.ts";
import { getDeadlineEpochSeconds, getRemainingSeconds } from "#lib/domain/practice-session.ts";
import { findOwnedPracticeSessionDetail } from "#lib/server/data/practice-sessions.ts";

export const load = (async ({ locals, params, depends }) => {
	depends("data:practiceSession");

	const { practiceSessionId } = params;
	const { user } = getPageSession(locals);

	const practiceSession = await findOwnedPracticeSessionDetail(user.id, practiceSessionId);

	if (!practiceSession) {
		error(404);
	}

	const category = practiceSession.task.category;
	const endAt = getDeadlineEpochSeconds(practiceSession.startedAt, category);

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
		endAt,
		timedUpAction:
			practiceSession.timeUpAction ??
			(practiceSession.type === "timed" && getRemainingSeconds(endAt) === 0 ? "stop" : null),
		metadata: {
			title: practiceSession.name,
			taskCategory: category,
			taskSubcategory: practiceSession.task.subcategory
		}
	};
}) satisfies PageServerLoad;
