<script lang="ts">
	import type { LayoutProps } from "./$types";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import {
		ArrowLeft,
		ChartNoAxesCombined,
		FileText,
		Gauge,
		History,
		MessageSquareText,
		Settings2,
		Users
	} from "@lucide/svelte";
	import type { Component } from "svelte";

	let { data, children }: LayoutProps = $props();

	const items = [
		{ path: "/admin", href: resolve("/admin"), label: "Dashboard", icon: Gauge },
		{ path: "/admin/users", href: resolve("/admin/users"), label: "Users", icon: Users },
		{ path: "/admin/tasks", href: resolve("/admin/tasks"), label: "Question Bank", icon: FileText },
		{ path: "/admin/sessions", href: resolve("/admin/sessions"), label: "Practice Sessions", icon: History },
		{ path: "/admin/ai", href: resolve("/admin/ai"), label: "AI Monitoring", icon: MessageSquareText },
		{ path: "/admin/ai/config", href: resolve("/admin/ai/config"), label: "AI Configuration", icon: Settings2 },
		{ path: "/admin/reports", href: resolve("/admin/reports"), label: "Reports", icon: ChartNoAxesCombined }
	] satisfies { path: string; href: string; label: string; icon: Component }[];

	const currentPath = $derived(page.url.pathname);
</script>

<svelte:head>
	<title>Admin · IELTS Writing Practice</title>
</svelte:head>

<div class="flex min-h-0 flex-1 flex-col lg:flex-row">
	<aside class="z-10 w-full shrink-0 border-b border-base-content/10 bg-base-100 p-3 shadow-sm lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-64 lg:border-r lg:border-b-0 lg:p-4 lg:shadow-none">
		<div class="mb-4 flex items-center justify-between gap-3 lg:mb-7 lg:items-start">
			<div class="min-w-0">
				<p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">Admin console</p>
				<p class="mt-1 truncate font-semibold">{data.adminUser.name}</p>
			</div>
			<a class="btn btn-ghost btn-sm shrink-0" href={resolve("/(protected)")}>
				<ArrowLeft class="size-4" />
				<span class="hidden sm:inline">Back to app</span>
			</a>
		</div>
		<nav class="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Admin navigation">
			{#each items as item (item.href)}
				{@const active = currentPath === item.path || (item.path !== "/admin" && currentPath.startsWith(`${item.path}/`))}
				<a
					class={["btn min-h-10 justify-start rounded-xl btn-sm", active ? "btn-primary shadow-sm" : "btn-ghost"]}
					href={item.href}
					aria-current={active ? "page" : undefined}>
					<item.icon class="size-4 shrink-0" />
					<span class="whitespace-nowrap">{item.label}</span>
				</a>
			{/each}
		</nav>
	</aside>
	<main id="main-content" class="min-w-0 flex-1 overflow-auto bg-base-200/20 p-4 sm:p-6 xl:p-8">
		<div class="mx-auto w-full max-w-screen-2xl space-y-5">
			{@render children()}
		</div>
	</main>
</div>

<style>
	:global(.admin-field) {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.5rem;
	}

	:global(.admin-field-label) {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.25rem;
		color: color-mix(in oklab, currentColor 82%, transparent);
	}

	:global(.admin-panel) {
		border: 1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent);
		border-radius: 1rem;
		background: var(--color-base-100);
		box-shadow: 0 1px 3px color-mix(in oklab, var(--color-base-content) 6%, transparent);
	}
</style>
