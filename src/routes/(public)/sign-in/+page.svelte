<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { Sparkles } from "@lucide/svelte";
	import { untrack } from "svelte";
	import AppLogo from "#lib/components/AppLogo.svelte";
	import GitHub from "#lib/components/icons/GitHub.svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import { signInSocial } from "./sign-in.remote.js";

	const { data } = $props();

	$effect(() => {
		(async () => {
			const result = signInSocial.result;
			if (result && !result.success) {
				untrack(() => {
					openModal({
						content: result.message,
						primaryButton: "Close",
						title: "Unable to Sign in"
					});
				});
			}

			const allIssues = signInSocial.fields.allIssues();
			if (allIssues && allIssues.length) {
				untrack(() => {
					openModal({
						content: `Failed to validate field "${allIssues[0].path}": ${allIssues[0].message}`,
						primaryButton: "Close",
						title: "Data validation failed"
					});
				});
			}
		})();
	});
</script>

<svelte:head>
	<title>Sign in | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Sign In" />
</svelte:head>

<main
	class="relative flex w-full items-center justify-center p-6 [--glass-blur:4px] lg:h-full lg:p-16"
	data-theme="light">
	<!-- Watermark background -->
	<div
		class="pointer-events-none absolute inset-0 animate-watermark bg-primary-content mask-[url('/watermark.svg')]">
	</div>

	<!-- Hero Flex Layout -->
	<section
		class="z-1 flex w-full max-w-6xl flex-col items-center justify-between gap-12 lg:flex-row">
		<!-- Left: Platform Overview / Landing Highlights -->
		<div class="flex flex-col gap-8 lg:max-w-xl">
			<div
				class="badge rounded-full badge-xs font-semibold tracking-wider uppercase badge-warning sm:text-xs sm:badge-md">
				<Sparkles class="h-4 w-4" />
				AI-Powered IELTS Academic Writing Tutor
			</div>

			<div class="flex flex-col gap-4">
				<h1
					class="text-3xl leading-tight font-black tracking-tight text-neutral sm:text-4xl lg:text-5xl">
					Achieve Your Target <div class="text-primary">
						IELTS Writing <span class="text-rotate">
							<span>
								<span class="text-warning">Band Score</span>
								<span class="bg-warning text-warning-content">Band Score</span>
							</span>
						</span>
					</div>
				</h1>
				<p class="leading-relaxed text-neutral/75 sm:text-lg">
					Practice IELTS Writing Task 1 and Task 2 with conversational AI feedback that helps you
					evaluate your responses, understand your mistakes, and improve your writing through
					targeted guidance.
				</p>
			</div>

			<!-- Feature List (Flexbox) -->
			<div class="flex flex-col flex-wrap gap-4 sm:flex-row">
				{#each data.features as feature (feature.title)}
					<div
						class="flex min-w-60 flex-1 items-start gap-4 rounded-box glass p-5 shadow-sm transition-shadow hover:shadow-md sm:w-[calc(50%-0.5rem)]">
						<div
							class="grid h-10 w-10 shrink-0 place-items-center rounded-box bg-primary/10 font-bold text-primary">
							<feature.icon class="h-5 w-5" />
						</div>
						<div class="flex flex-col gap-1">
							<h3 class="text-sm font-bold text-primary">{feature.title}</h3>
							<p class="text-xs leading-relaxed text-neutral/65">{feature.description}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Right: Authentication Card -->
		<section
			class="flex w-full max-w-md flex-col items-center gap-8 rounded-box glass p-8 shadow-md sm:p-10">
			<div class="flex flex-col items-center gap-3 text-center">
				<AppLogo class="h-14 w-14 text-xl" />
				<div class="flex flex-col gap-1">
					<h2 class="text-2xl font-semibold text-neutral">Welcome Learner!</h2>
					<p class="text-sm text-neutral/65">Sign in to start your IELTS writing session</p>
				</div>
			</div>

			<form class="flex w-full flex-col items-center gap-4" {...signInSocial}>
				<input {...signInSocial.fields.callbackURL.as("hidden", page.url.origin)} />
				<button
					class="btn btn-wide btn-outline btn-neutral hover:shadow-md"
					disabled={signInSocial.pending > 0}
					{...signInSocial.fields.provider.as("submit", "github")}>
					<GitHub class="h-5 w-5" />
					Continue with GitHub
				</button>
			</form>

			<p class="text-center text-xs text-neutral/60">
				By signing in, you agree to our
				<span class="mt-1 block">
					<a class="link font-medium link-primary" href={resolve("/(public)/terms-of-service")}>
						Terms of Service
					</a>
					and
					<a class="link font-medium link-primary" href={resolve("/(public)/privacy-policy")}>
						Privacy Policy
					</a>
				</span>
			</p>
		</section>
	</section>
</main>
