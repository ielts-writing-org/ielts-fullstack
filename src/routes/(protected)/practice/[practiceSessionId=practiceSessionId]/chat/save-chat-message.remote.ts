import { chatMessageSchema } from "#lib/schemas/chat-message.ts";
import { getSessionApi } from "#lib/server/auth.ts";
import { chatMessages, practiceSessions } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import z from "zod";

export const saveChatMessage = command(
	z.object({
		practiceSessionId: z.uuidv7(),
		chatMessage: chatMessageSchema
	}),
	async ({ practiceSessionId, chatMessage }) => {
		const { locals } = getRequestEvent();
		const { user } = getSessionApi(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const [practiceSession] = await db
			.select({ practiceSessionId: practiceSessions.id })
			.from(practiceSessions)
			.where(and(eq(practiceSessions.id, practiceSessionId), eq(practiceSessions.userId, user.id)));

		if (!practiceSession) {
			error(404, "Practice Session does not exist.");
		}

		await db.insert(chatMessages).values({
			practiceSessionId: practiceSession.practiceSessionId,
			from: chatMessage.from,
			message: chatMessage.message
		});

		return { success: true };
	}
);
