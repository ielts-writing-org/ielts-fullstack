import { getApiSession } from "#lib/server/auth/session.ts";
import { practiceSessions } from "#lib/server/db/app.schema.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import z from "zod";

export const deletePracticeSession = command(
	z.object({
		practiceSessionId: z.uuidv7()
	}),
	async ({ practiceSessionId }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDatabase();
		const practiceSession = await db.query.practiceSessions.findFirst({
			where: {
				id: practiceSessionId,
				userId: user.id
			}
		});

		if (!practiceSession) {
			error(404, "Practice Session does not exist.");
		}

		await db
			.delete(practiceSessions)
			.where(and(eq(practiceSessions.id, practiceSessionId), eq(practiceSessions.userId, user.id)));

		return { success: true };
	}
);
