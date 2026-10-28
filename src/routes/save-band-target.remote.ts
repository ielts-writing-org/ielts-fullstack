import { bandSchema } from "#lib/schemas/band.ts";
import { getSessionApi } from "#lib/server/auth.ts";
import { profiles } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const saveBandTarget = command(
	z.object({
		bandTarget: bandSchema
	}),
	async ({ bandTarget }) => {
		const { locals } = getRequestEvent();
		const { profile: userProfile } = getSessionApi(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const result = await db
			.update(profiles)
			.set({ bandTarget })
			.where(eq(profiles.id, userProfile.id));

		if (result.meta.changes === 0) {
			error(404, "Profile does not exist.");
		}

		return { success: true };
	}
);
