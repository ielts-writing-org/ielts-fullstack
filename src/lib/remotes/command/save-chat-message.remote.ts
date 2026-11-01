import { chatMessageSchema } from "#lib/schemas/chat-message.ts";
import { getApiSession } from "#lib/server/auth/index.ts";
import { chatMessages, practiceSessions } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import z from "zod";

export const saveChatMessages = command(
	z.object({
		practiceSessionId: z.uuidv7(),
		chatMessages: z.array(chatMessageSchema).length(2)
	}),
	async (data) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const [practiceSession] = await db
			.select({ practiceSessionId: practiceSessions.id })
			.from(practiceSessions)
			.where(
				and(eq(practiceSessions.id, data.practiceSessionId), eq(practiceSessions.userId, user.id))
			);

		if (!practiceSession) {
			error(404, "Practice Session does not exist.");
		}

		await db.insert(chatMessages).values(
			data.chatMessages.map((m) => ({
				practiceSessionId: practiceSession.practiceSessionId,
				from: m.from,
				message: m.message
			}))
		);

		return { success: true };
	}
);
