<script>
	import AppLogo from "#lib/components/AppLogo.svelte";
	import { resolve } from "$app/paths";
	import { GraduationCap } from "@lucide/svelte";
</script>

<div
	class="relative overflow-hidden rounded-box border border-white/10 bg-linear-to-br from-[#19264a] via-[#111a33] to-[#0c1225] p-4">
	<div class="flex items-center gap-2">
		<AppLogo />

		<div class="min-w-0">
			<p class="text-xs font-bold tracking-wide text-indigo-300/80 uppercase">
				Achieve Your Target IELTS Writing <span class="text-rotate">
					<span>
						<span class="text-warning">Band Score</span>
						<span class="bg-warning text-warning-content">Band Score</span>
					</span>
				</span>
			</p>
			<h2 class="mt-0.5 text-sm font-bold tracking-tight text-white">
				IELTS WRITING PRACTICE PLATFORM
			</h2>
		</div>
	</div>

	<p class="mt-4 text-xs leading-relaxed text-slate-400">
		Practice IELTS Writing Task 1 and Task 2 with conversational AI feedback that helps you evaluate
		your responses, understand your mistakes, and improve your writing through targeted guidance.
	</p>

	<div class="mt-3 flex items-center gap-2 text-xs text-slate-400">
		<GraduationCap class="size-4 shrink-0 text-indigo-300" />
		Built for practice, progress, and independent learning.
	</div>

	<div class="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
		<span class="text-xs font-semibold tracking-wide text-slate-500">
			IELTS WRITING PRACTICE PLATFORM
		</span>

		<nav aria-label="Legal information" class="flex shrink-0 items-center gap-3 text-xs">
			<a href={resolve("terms-of-service")} class="link text-slate-400 link-hover">Terms</a>
			<span class="h-3 w-px bg-white/15" aria-hidden="true"></span>
			<a href={resolve("privacy-policy")} class="link text-slate-400 link-hover">Privacy</a>
		</nav>
	</div>
</div>
