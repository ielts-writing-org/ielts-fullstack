<script lang="ts">
	import GitHub from "#lib/components/icons/GitHub.svelte";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { CircleX } from "@lucide/svelte";
	import { signInSocial } from "./signIn.remote";
</script>

<svelte:head>
	<title>Sign in | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Sign In" />
</svelte:head>

<div class="relative flex h-screen w-full items-center justify-center bg-base-200">
	<!-- Watermark -->
	<div class="absolute inset-0 animate-watermark bg-base-content/20 mask-[url('/watermark.svg')]">
	</div>
	<!-- Toast -->
	{#if signInSocial.result && !signInSocial.result.success}
		<div class="toast toast-end toast-top mt-15">
			<div class="alert alert-error text-white">
				<CircleX class="h-5 w-5" />
				<span>{signInSocial.result?.message}</span>
			</div>
		</div>
	{/if}
	<!-- Content -->
	<div
		class="z-1 flex w-full max-w-sm flex-col items-center gap-6 rounded-xl bg-base-100 p-8 shadow-sm"
		data-theme="light">
		<div class="flex flex-col items-center gap-4">
			<span
				class="grid h-10 w-10 place-items-center rounded-lg bg-primary text-sm font-extrabold text-primary-content">
				AI
			</span>
			<div class="text-center">
				<h1 class=" text-neutral">
					<span class="block">Welcome to</span>
					<span class="block text-xl font-bold">IELTS Writing Practice Platform</span>
				</h1>
				<p class="text-sm text-neutral">Sign in to continue to your IELTS Academic AI Tutor</p>
			</div>
		</div>

		<form class="flex w-full flex-col items-center gap-2" {...signInSocial}>
			<input {...signInSocial.fields.callbackURL.as("hidden", page.url.origin)} />
			<button
				class="btn btn-wide btn-outline btn-neutral"
				disabled={signInSocial.submitted}
				{...signInSocial.fields.provider.as("submit", "github")}>
				<GitHub class="h-[1.25em] w-[1.25em]" />
				Continue with GitHub
			</button>
		</form>

		<p class="text-center text-xs text-neutral/75">
			By signing in, you agree to our
			<span class="block">
				<a class="link" href={resolve("/(public)")}>Terms of Service</a>
				and
				<a class="link" href={resolve("/(public)")}>Privacy Policy</a>
				.
			</span>
		</p>
	</div>
</div>
