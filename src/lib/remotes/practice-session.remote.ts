import { resolve } from "$app/paths";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { getApiSession } from "#lib/server/auth/session.ts";
import {
	deleteOwnedPracticeSession,
	findOwnedPracticeSessionId,
	insertPracticeSession,
	updateOwnedPracticeSessionName,
	updateOwnedPracticeSessionResponse,
	updateOwnedPracticeSessionTimeUpAction
} from "#lib/server/data/practice-sessions.ts";
import { deleteSessionChatMessages, insertChatMessages } from "#lib/server/data/chat-messages.ts";
import { upsertEvaluation } from "#lib/server/data/evaluations.ts";
import { findPracticableTaskCategory, insertTask } from "#lib/server/data/tasks.ts";
import {
	changeSessionNameInput,
	createPracticeInput,
	practiceSessionIdInput,
	saveChatMessagesInput,
	saveEvaluationInput,
	savePracticeResponseInput,
	setTimedUpActionInput
} from "./practice-session.schema.ts";

export const createPractice = command(
	createPracticeInput,
	async ({ taskCategory, taskId, practiceSessionType }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		let effectiveTaskId = taskId;
		if (!effectiveTaskId) {
			const [createdTask] = await insertTask({
				userId: user.id,
				category: taskCategory,
				subcategory: null,
				prompt: ""
			});
			effectiveTaskId = createdTask.id;
		} else {
			const task = await findPracticableTaskCategory(effectiveTaskId, user.id);
			if (!task) error(404);
			if (task.category !== taskCategory) error(400);
		}

		const [createdPracticeSession] = await insertPracticeSession({
			userId: user.id,
			taskId: effectiveTaskId,
			name: "Draft",
			type: practiceSessionType,
			response: ""
		});

		return {
			location: resolve("/(protected)/practice/[practiceSessionId=practiceSessionId]", {
				practiceSessionId: createdPracticeSession.id
			}),
			success: true
		};
	}
);

export const savePracticeResponse = command(
	savePracticeResponseInput,
	async ({ practiceSessionId, response }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const saved = await updateOwnedPracticeSessionResponse(user.id, practiceSessionId, response);

		if (!saved) {
			error(404, "Practice Session does not exist");
		}

		return { success: true };
	}
);

export const changeSessionName = command(
	changeSessionNameInput,
	async ({ practiceSessionId, newName }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const saved = await updateOwnedPracticeSessionName(user.id, practiceSessionId, newName);

		if (!saved) {
			error(404, "Practice Session does not exist.");
		}

		return { success: true };
	}
);

export const setTimedUpAction = command(
	setTimedUpActionInput,
	async ({ practiceSessionId, timedUpAction }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const saved = await updateOwnedPracticeSessionTimeUpAction(
			user.id,
			practiceSessionId,
			timedUpAction
		);

		if (!saved) {
			error(404, "Practice does not exist");
		}

		return { success: true };
	}
);

export const deletePracticeSession = command(
	practiceSessionIdInput,
	async ({ practiceSessionId }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const practiceSession = await findOwnedPracticeSessionId(user.id, practiceSessionId);

		if (!practiceSession) {
			error(404, "Practice Session does not exist.");
		}

		await deleteOwnedPracticeSession(user.id, practiceSessionId);

		return { success: true };
	}
);

export const saveChatMessages = command(
	saveChatMessagesInput,
	async ({ practiceSessionId, chatMessages }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const session = await findOwnedPracticeSessionId(user.id, practiceSessionId);

		if (!session) {
			error(404, "Practice Session does not exist.");
		}

		await insertChatMessages(
			chatMessages.map((m) => ({
				practiceSessionId,
				from: m.from,
				message: m.message
			}))
		);

		return { success: true };
	}
);

export const clearChatMessages = command(practiceSessionIdInput, async ({ practiceSessionId }) => {
	const { locals } = getRequestEvent();
	const { user } = getApiSession(locals);

	const session = await findOwnedPracticeSessionId(user.id, practiceSessionId);
	if (!session) error(404, "Practice session not found.");

	await deleteSessionChatMessages(practiceSessionId);
	return { success: true };
});

export const saveEvaluation = command(
	saveEvaluationInput,
	async ({ practiceSessionId, evaluation }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const practiceSession = await findOwnedPracticeSessionId(user.id, practiceSessionId);

		if (!practiceSession) {
			error(404, "Practice Session does not exist.");
		}

		await upsertEvaluation(practiceSessionId, evaluation);

		return { success: true };
	}
);
