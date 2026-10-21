import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getSessionApi } from "#lib/server/auth.ts";
import { practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";

export const saveTaskPrompt = command(
	z.object({
		practiceSessionId: z.uuidv7(),
		prompt: z.string()
	}),
	async ({ practiceSessionId, prompt }) => {
		const { locals } = getRequestEvent();
		const { user } = getSessionApi(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const result = await db
			.update(tasks)
			.set({ prompt })
			.from(practiceSessions)
			.where(and(eq(practiceSessions.id, practiceSessionId), eq(tasks.userId, user.id)));

		if (!result.meta.changes) {
			error(404, "Task does not exist");
		}

		return { success: true };
	}
);
