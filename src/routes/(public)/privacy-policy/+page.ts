import type { PageLoad } from "./$types";

export const load = (async ({ fetch }) => {
	const req = await fetch("/pp.md");
	return {
		pp: await req.text()
	};
}) satisfies PageLoad;
