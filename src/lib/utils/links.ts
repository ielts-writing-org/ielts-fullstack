import { resolve } from "$app/paths";

export function buildResolveWithQuery(routeId: "tasks" | "history", query?: string) {
	if (query) {
		return resolve(`${routeId}?${query}`);
	}
	return resolve(routeId);
}
