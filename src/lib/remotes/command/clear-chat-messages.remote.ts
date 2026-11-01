import { getApiSession } from "#lib/server/auth/index.ts";
import { chatMessages, practiceSessions } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq, exists } from "drizzle-orm";
import z from "zod";

export const clearChatMessages = command(
	z.object({
		practiceSessionId: z.uuidv7()
	}),
	async ({ practiceSessionId }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const result = await db
			.delete(chatMessages)
			.where(
				and(
					eq(chatMessages.practiceSessionId, practiceSessionId),
					exists(
						db
							.select({ id: practiceSessions.id })
							.from(practiceSessions)
							.where(eq(practiceSessions.userId, user.id))
					)
				)
			);

		if (!result.meta.changes) {
			error(404, "Practice Session does not exist.");
		}

		return { success: true };
	}
);
