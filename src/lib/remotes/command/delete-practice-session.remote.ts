import { getApiSession } from "#lib/server/auth/index.ts";
import { practiceSessions } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import z from "zod";

export const deletePracticeSession = command(
	z.object({
		practiceSessionId: z.uuidv7()
	}),
	async ({ practiceSessionId }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const practiceSession = await db.query.practiceSessions.findFirst({
			where: (practices, { and, eq }) =>
				and(eq(practices.id, practiceSessionId), eq(practices.userId, user.id))
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
