<script lang="ts">
	import { authClient } from "#lib/auth/auth-client.ts";
	import { refreshAll } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { Sparkle } from "@lucide/svelte";

	let { children, data } = $props();

	const handleSignOut = async () => {
		const result = await authClient.signOut();
		if (result.data?.success) {
			await refreshAll();
		}
	};
</script>

<div class="min-h-screen w-full bg-base-100 text-base-content">
	<header class=" sticky top-0 flex flex-col gap-2 border-b border-base-content/10 bg-base-100">
		<div class="navbar flex w-full justify-between">
			<a
				class="navbar-start min-w-29 items-center gap-2"
				href={resolve("/(public)/(dashboard)")}
				aria-label="IELTS Writing Practice Platform Home">
				<span
					class="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-lg bg-primary font-extrabold text-primary-content">
					AI
				</span>
				<div class="flex flex-col">
					<h1 class="text-lg font-semibold">IELTS Writing Practice Platform</h1>
					<h2 class="text-xs text-base-content/75">with IELTS Academic AI Tutor</h2>
				</div>
			</a>

			<nav class="navbar-center hidden gap-2 text-sm lg:inline-flex" aria-label="Main navigation">
				<a
					class="rounded-box bg-primary-content px-3 py-1.5 font-semibold text-primary hover:text-primary"
					href={resolve("/(public)/(dashboard)")}>
					Practice
				</a>
				<a
					class="rounded-box px-3 py-1.5 font-semibold text-base-content hover:text-primary"
					href={resolve("/(public)/(dashboard)")}>
					Tasks
				</a>
				<a
					class="rounded-box px-3 py-1.5 font-semibold text-base-content hover:text-primary"
					href={resolve("/(public)/(dashboard)")}>
					History
				</a>
				<a
					class="relative rounded-box px-3 py-1.5 font-semibold text-base-content hover:text-warning"
					href={resolve("/(public)/(dashboard)")}>
					<Sparkle class="absolute top-1 right-0.5 text-warning" size="0.875em" />
					AI Tutor
				</a>
			</nav>

			<div class="navbar-end flex items-center justify-end gap-2 sm:gap-3">
				{#if data.session}
					<a
						class="badge hidden badge-outline badge-sm font-semibold badge-warning sm:inline-flex"
						href={resolve("/(public)/(dashboard)")}>
						🔥 5-Day Streak
					</a>
					<div class="flex flex-col items-end gap-1">
						<div class="text-sm font-semibold">{data.session.user.name}</div>
						<a
							class="badge badge-soft badge-xs font-semibold"
							href={resolve("/(public)/(dashboard)")}>
							Target: Band 7.5
						</a>
					</div>
					<div class="avatar">
						<button class="cursor-pointer" onclick={handleSignOut} title="Sign Out">
							<img
								class="w-8 rounded-full ring ring-base-content/20"
								src={data.session.user.image}
								alt={data.session.user.name} />
						</button>
					</div>
				{:else}
					<a href={resolve("signIn")} class="btn btn-outline btn-primary btn-sm">Sign in</a>
				{/if}
			</div>
		</div>

		<nav
			class="flex w-full items-center justify-evenly gap-1 text-sm lg:hidden"
			aria-label="Main navigation">
			<a
				class="rounded-box bg-primary-content px-3 py-1.5 font-semibold text-primary hover:text-primary"
				href={resolve("/(public)/(dashboard)")}>
				Practice
			</a>
			<a
				class="rounded-box px-3 py-1.5 font-semibold text-base-content hover:text-primary"
				href={resolve("/(public)/(dashboard)")}>
				Tasks
			</a>
			<a
				class="rounded-box px-3 py-1.5 font-semibold text-base-content hover:text-primary"
				href={resolve("/(public)/(dashboard)")}>
				History
			</a>
			<a
				class="rounded-box px-3 py-1.5 font-semibold text-base-content hover:text-primary"
				href={resolve("/(public)/(dashboard)")}>
				AI Tutor
			</a>
		</nav>
	</header>

	{@render children()}
</div>
