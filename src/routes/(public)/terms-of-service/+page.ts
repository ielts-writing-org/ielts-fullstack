import type { PageLoad } from "./$types";

export const load = (async ({ fetch }) => {
	const req = await fetch("/tos.md");
	return {
		tos: await req.text()
	};
}) satisfies PageLoad;
