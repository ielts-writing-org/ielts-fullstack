import { getApiSession } from "#lib/server/auth/session.ts";
import { chatMessages } from "#lib/server/db/app.schema.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";

export const clearChatMessages = command(
	z.object({ practiceSessionId: z.uuidv7() }),
	async ({ practiceSessionId }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDatabase();
		const session = await db.query.practiceSessions.findFirst({
			columns: { id: true },
			where: { id: practiceSessionId, userId: user.id }
		});
		if (!session) error(404, "Practice session not found.");

		await db.delete(chatMessages).where(eq(chatMessages.practiceSessionId, practiceSessionId));
		return { success: true };
	}
);
