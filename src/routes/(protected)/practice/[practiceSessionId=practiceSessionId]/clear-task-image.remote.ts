import { getApiSession } from "#lib/server/auth/index.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import z from "zod";

export const clearTaskImage = command(
	z.object({
		taskId: z.uuidv7()
	}),
	async ({ taskId }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const task = await db.query.tasks.findFirst({
			where: (tasks, { eq, and }) => and(eq(tasks.id, taskId), eq(tasks.userId, user.id))
		});

		if (!task) {
			error(404, "Task does not exist.");
		}

		const oldImageName = task.image;
		await db.update(tasks).set({ image: null }).where(eq(tasks.id, taskId));

		if (oldImageName) {
			await env.IELTS_WRITING_BUCKET.delete(oldImageName);
		}

		return { success: true };
	}
);
