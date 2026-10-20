import { requireSessionApi } from "#lib/server/auth.ts";
import { profile } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const saveTarget = command(
	z.object({
		target: z.float32()
	}),
	async ({ target }) => {
		const { locals } = getRequestEvent();
		const { profile: userProfile } = requireSessionApi(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const result = await db.update(profile).set({ target }).where(eq(profile.id, userProfile.id));

		if (result.meta.changes === 0) {
			error(404, "Profile does not exist.");
		}

		return { success: true };
	}
);
