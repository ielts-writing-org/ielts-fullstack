import { getApiSession } from "#lib/server/auth/session.ts";
import { getDb } from "#lib/server/db/index.ts";
import { isValidUUIDv7 } from "#lib/utils/validator.ts";
import { getImagePath } from "#lib/utils/paths.ts";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import type { RequestHandler } from "./$types";

// Task images are compressed to WebP and stored under the shared images/ prefix.
export const GET = (async ({ locals, params }) => {
	const { user } = getApiSession(locals);
	if (!isValidUUIDv7(params.taskId)) error(404, "Image does not exist.");

	const db = getDb(env.IELTS_WRITING_DB);
	const task = await db.query.tasks.findFirst({
		columns: { id: true, imageName: true, userId: true, published: true, deletedAt: true },
		where: (fields, { eq }) => eq(fields.id, params.taskId)
	});
	if (!task) error(404, "Image does not exist.");

	const ownsTask = task.userId === user.id;
	const publicTask = task.userId === null && task.published && task.deletedAt === null;
	const ownsHistoricalSession = await db.query.practiceSessions.findFirst({
		columns: { id: true },
		where: (fields, { and, eq, isNull }) =>
			and(eq(fields.taskId, task.id), eq(fields.userId, user.id), isNull(fields.deletedAt))
	});
	const isAdmin = user.role === "admin";
	if (!ownsTask && !publicTask && !ownsHistoricalSession && !isAdmin) {
		error(404, "Image does not exist.");
	}

	if (!task.imageName) {
		error(404, "Image does not exist.");
	}

	const object = await env.IELTS_WRITING_BUCKET.get(getImagePath(task.imageName));
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
