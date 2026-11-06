import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { getApiSession } from "#lib/server/auth/session.ts";
import { getObjectAsStream } from "#lib/server/infrastructure/bucket.ts";

export const GET: RequestHandler = async ({ locals, params }) => {
	getApiSession(locals);

	const stream = await getObjectAsStream(params.imageName);
	if (!stream) {
		error(404);
	}

	return new Response(stream, {
		headers: { "content-type": "image/webp", "cache-control": "private, max-age=86400" }
	});
};
