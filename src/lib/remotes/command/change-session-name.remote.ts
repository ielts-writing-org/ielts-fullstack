import { getApiSession } from "#lib/server/auth/session.ts";
import { practiceSessions } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { countWords } from "#lib/utils/stats.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import z from "zod";

export const changeSessionName = command(
	z.object({
		practiceSessionId: z.uuidv7(),
		newName: z.string().refine(
			(value) => {
				const count = countWords(value);
				return count >= 1 && count <= 24;
			},
			{ error: "Practice Session Name must be between 1 and 24 words." }
		)
	}),
	async ({ practiceSessionId, newName }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const result = await db
			.update(practiceSessions)
			.set({ name: newName })
			.where(and(eq(practiceSessions.id, practiceSessionId), eq(practiceSessions.userId, user.id)));

		if (result.meta.changes === 0) {
			error(404, "Practice Session does not exist.");
		}

		return { success: true };
	}
);
