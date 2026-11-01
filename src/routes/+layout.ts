import type { LayoutLoad } from "./$types";
import type { RouteIdWithSearchOrHash, PathnameWithSearchOrHash } from "$app/types";
import type { Component } from "svelte";
import { LibraryBig, PenLine, RotateCcwClock } from "@lucide/svelte";

const navItems = [
	{ href: "/(protected)", label: "Practice", icon: PenLine },
	{ href: "/(protected)/tasks", label: "Tasks", icon: LibraryBig },
	{ href: "/(protected)/history", label: "History", icon: RotateCcwClock }
] as const satisfies readonly {
	href: RouteIdWithSearchOrHash | PathnameWithSearchOrHash;
	label: string;
	icon: Component;
}[];

export const load = (async ({ data }) => {
	return {
		session: data.session,
		user: data.user,
		profile: data.profile,
		navItems: navItems
	};
}) satisfies LayoutLoad;
