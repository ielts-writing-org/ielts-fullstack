import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireSessionApi } from "#lib/server/auth.ts";
import { practiceSession } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";

export const saveTaskResponse = command(
	z.object({
		practiceSessionId: z.uuidv7(),
		response: z.string()
	}),
	async ({ practiceSessionId, response }) => {
		const { locals } = getRequestEvent();
		const { user } = requireSessionApi(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const result = await db
			.update(practiceSession)
			.set({ response })
			.where(and(eq(practiceSession.id, practiceSessionId), eq(practiceSession.userId, user.id)));

		if (!result.meta.changes) {
			error(404, "Practice Session does not exist");
		}

		return { success: true };
	}
);
