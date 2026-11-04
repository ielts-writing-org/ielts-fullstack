import { bandSchema } from "#lib/domain/band.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import { profiles } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getProfile } from "../query/get-profile.remote";

export const saveBandTarget = command(
	z.object({
		bandTarget: bandSchema
	}),
	async ({ bandTarget }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const [updatedProfile] = await db
			.update(profiles)
			.set({ bandTarget })
			.where(eq(profiles.userId, user.id))
			.returning();

		if (!updatedProfile) {
			error(404, "Profile does not exist.");
		}

		getProfile().set(updatedProfile);
	}
);
