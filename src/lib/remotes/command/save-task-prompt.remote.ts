import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { tasks } from "#lib/server/db/app.schema.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { getApiSession } from "#lib/server/auth/session.ts";

export const saveTaskPrompt = command(
	z.object({
		taskId: z.uuidv7(),
		prompt: z.string()
	}),
	async ({ taskId, prompt }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDatabase();
		const result = await db
			.update(tasks)
			.set({ prompt })
			.where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));

		if (!result.meta.changes) {
			error(404);
		}

		return { success: true };
	}
);
