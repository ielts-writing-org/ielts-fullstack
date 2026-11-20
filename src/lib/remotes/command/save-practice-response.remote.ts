import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { practiceSessions } from "#lib/server/db/app.schema.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { getApiSession } from "#lib/server/auth/session.ts";

export const savePracticeResponse = command(
	z.object({
		practiceSessionId: z.uuidv7(),
		response: z.string()
	}),
	async ({ practiceSessionId, response }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDatabase();
		const result = await db
			.update(practiceSessions)
			.set({ response })
			.where(and(eq(practiceSessions.id, practiceSessionId), eq(practiceSessions.userId, user.id)));

		if (!result.meta.changes) {
			error(404, "Practice Session does not exist");
		}

		return { success: true };
	}
);
