import { z } from "zod";
import { command, getRequestEvent, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { getAdminSession } from "#lib/server/auth/session.ts";
import { recordAdminAction } from "#lib/server/data/admin-audit-logs.ts";
import { listChatMessages } from "#lib/server/data/chat-messages.ts";
import {
	countAdminSessions,
	deletePracticeSessionById,
	findAdminSessionDetail,
	findPracticeSessionById,
	listAdminSessions
} from "#lib/server/data/practice-sessions.ts";
import { computeDeterministicStats } from "#lib/domain/text-stats.ts";
import { adminSessionIdInput, getAdminSessionsInput } from "./admin-sessions.schema.ts";

export const getAdminSessions = query(
	getAdminSessionsInput,
	async ({ page, pageSize, search, category, type, evaluation, days }) => {
		await getAdminSession(getRequestEvent().locals);
		const filters = { page, pageSize, search, category, type, evaluation, days };
		const [total, sessions] = await Promise.all([
			countAdminSessions(filters),
			listAdminSessions(filters)
		]);
		return { sessions, page, pageSize, total };
	}
);

export const getAdminSessionDetail = query(z.uuidv7(), async (practiceSessionId) => {
	await getAdminSession(getRequestEvent().locals);
	const [session] = await findAdminSessionDetail(practiceSessionId);
	if (!session) error(404, "Practice session not found.");
	const messages = await listChatMessages(practiceSessionId);
	return {
		...session,
		wordCount: computeDeterministicStats(session.response).words,
		messages
	};
});

export const deleteAdminSession = command(adminSessionIdInput, async ({ practiceSessionId }) => {
	const { user } = await getAdminSession(getRequestEvent().locals);
	const target = await findPracticeSessionById(practiceSessionId);
	if (!target) error(404, "Practice session not found.");
	// The session FK uses ON DELETE CASCADE for evaluations and chats; one D1
	// statement keeps the dependent cleanup atomic without db.transaction().
	await deletePracticeSessionById(practiceSessionId);
	await recordAdminAction(
		user.id,
		"practice_session.delete",
		"practice_session",
		practiceSessionId
	);
	return { success: true };
});
