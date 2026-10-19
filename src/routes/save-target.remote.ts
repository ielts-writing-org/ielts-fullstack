import { profile } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const saveTarget = command(
	z.object({
		profileId: z.uuidv7(),
		target: z.float32()
	}),
	async ({ profileId, target }) => {
		const db = getDb(env.IELTS_WRITING_DB);
		const result = await db.update(profile).set({ target }).where(eq(profile.id, profileId));

		if (result.meta.changes === 0) {
			error(404, "Profile does not exist.");
		}

		return { success: true };
	}
);
