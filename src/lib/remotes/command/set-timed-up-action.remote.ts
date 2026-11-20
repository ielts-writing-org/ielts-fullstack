import { getApiSession } from "#lib/server/auth/session.ts";
import { practiceSessions } from "#lib/server/db/app.schema.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
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

		const db = getDatabase();
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
