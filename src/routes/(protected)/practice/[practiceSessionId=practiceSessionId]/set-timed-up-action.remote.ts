import { getApiSession } from "#lib/server/auth/index.ts";
import { practiceSessions } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const setTimedUpAction = command(
	z.object({
		practiceSessionId: z.uuidv7(),
		timedUpAction: z.enum(["stop"])
	}),
	async ({ practiceSessionId, timedUpAction }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const result = await db
			.update(practiceSessions)
			.set({ timeUpAction: timedUpAction })
			.where(and(eq(practiceSessions.userId, user.id), eq(practiceSessions.id, practiceSessionId)));

		if (result.meta.changes === 0) {
			error(404, "Practice does not exist");
		}

		return { success: true };
	}
);
