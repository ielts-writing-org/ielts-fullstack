<script lang="ts">
	import { resolve } from "$app/paths";
	import AppLogo from "#lib/components/AppLogo.svelte";
</script>

<div class="navbar-start flex-1 items-center">
	<a class="flex items-center gap-2" href={resolve("/(protected)")} aria-label="Dashboard">
		<AppLogo />
		<div class="flex flex-col">
			<h1 class="leading-6 font-bold text-primary sm:text-lg">IELTS Writing Practice Platform</h1>
			<h2 class="hidden text-xs font-semibold text-base-content/75 sm:inline">
				with IELTS Academic AI Tutor
			</h2>
		</div>
	</a>
</div>
