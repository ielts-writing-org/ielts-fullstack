import type { Component } from "svelte";
import { LibraryBig, PenLine, RotateCcwClock } from "@lucide/svelte";

export type NavRouteId = "/(protected)" | "/(protected)/tasks" | "/(protected)/history";

/** The three top-level destinations, shared by the desktop nav and the mobile tab bar. */
export const navItems = [
	{ href: "/(protected)", label: "Practice", icon: PenLine },
	{ href: "/(protected)/tasks", label: "Tasks", icon: LibraryBig },
	{ href: "/(protected)/history", label: "History", icon: RotateCcwClock }
] as const satisfies readonly { href: NavRouteId; label: string; icon: Component }[];
