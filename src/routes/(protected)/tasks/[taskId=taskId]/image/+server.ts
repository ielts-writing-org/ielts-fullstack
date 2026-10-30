import { getApiSession } from "#lib/server/auth/index.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

// Task images are always stored as compressed webp blobs (see CfImagesClient).
export const GET = (async ({ locals, params }) => {
	const { user } = getApiSession(locals);

	const db = getDb(env.IELTS_WRITING_DB);
	const task = await db.query.tasks.findFirst({
		columns: { image: true },
		where: (fields, { and, eq }) => and(eq(fields.id, params.taskId), eq(fields.userId, user.id))
	});

	if (!task?.image) {
		error(404, "Image does not exist.");
	}

	const object = await env.IELTS_WRITING_BUCKET.get(task.image);
	if (!object) {
		error(404, "Image does not exist.");
	}

	return new Response(object.body, {
		headers: {
			"content-type": "image/webp",
			// Image keys are unique per upload, so a cached copy never goes stale.
			"cache-control": "private, max-age=86400"
		}
	});
}) satisfies RequestHandler;
