<!-- TODO: Rate limit -->

<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import AppLogo from "#lib/components/AppLogo.svelte";
	import WatermarkBackground from "#lib/components/WatermarkBackground.svelte";
	import LegacySignInMethods from "./LegacySignInMethods.svelte";
	import PlatformOverview from "./PlatformOverview.svelte";
	import AuthForm from "./AuthForm.svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import { getAllAuthModes, getAuthModeLabel, type AuthMode } from "./auth-mode";
	import { Info } from "@lucide/svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";

	let mode = $state<AuthMode>("sign-in");
	let registeredEmail = $derived(page.url.searchParams.get("registered-email") ?? "");

	async function handleAccountCreated(email: string) {
		await goto(`${resolve("/(public)/sign-in")}?registered-email=${email}`, {
			replace: true
		});
		mode = "sign-in";

		openModal({
			title: "Email verification",
			content: { snippet: pendingVerification },
			primaryButton: "Close"
		});
	}

	onMount(() => {
		const error = page.url.searchParams.get("error");

		if (!error) {
			return;
		}

		let title: string;
		let content: string;

		switch (error) {
			// TODO: Planned to remove
			case "access_denied":
				title = "Access Denied";
				content = "You have denied access to your third-party account.";
				break;

			// TODO: Planned to remove
			case "state_mismatch":
				title = "State Mismatch";
				content =
					"The state returned by your OAuth provider is not match any record saved in the system. Please try again.";
				break;

			case "BANNED_USER":
				title = "You have been banned";
				content =
					"You have been banned from this platform. Please contact support if you believe this is a mistake.";
				break;

			case "INVALID_TOKEN":
				title = "Email verification failed";
				content = "The email verification link has been expired or contains invalid token.";
				break;

			default:
				title = "Unhandled Sign in error";
				content = "Please try again.";
				break;
		}

		openModal({ title, content, primaryButton: "Close" });
	});
</script>

<svelte:head>
	<title>Sign in | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Sign In" />
</svelte:head>

<!-- TODO: Planned to remove -->
<LegacySignInMethods />

<main
	id="main-content"
	class="relative flex w-full items-center justify-center px-6 py-2 [--glass-blur:4px] lg:h-full lg:px-16"
	data-theme="light">
	<WatermarkBackground />

	<!-- Hero Flex Layout -->
	<section
		class="z-1 flex w-full max-w-6xl flex-col items-center justify-between gap-12 lg:flex-row">
		<PlatformOverview />

		<!-- Right: Authentication Card -->
		<section
			class="flex w-full max-w-md flex-col items-center gap-2 rounded-box glass p-3 shadow-md">
			<div class="flex flex-col items-center gap-3 text-center">
				<AppLogo class="h-14 w-14 text-xl" />
				<div class="flex flex-col gap-1">
					<h2 class="text-2xl font-semibold text-neutral">
						{mode === "sign-in" ? "Welcome back!" : "Welcome new Learner!"}
					</h2>
					<p class="text-sm text-neutral/65">
						{mode === "sign-in"
							? "Sign in to continue your IELTS writing practice"
							: "Start your IELTS writing journey today"}
					</p>
				</div>
			</div>

			<div class="tabs tabs-border" role="tablist">
				{#each getAllAuthModes() as authMode (authMode)}
					<input
						type="radio"
						name="auth_tabs"
						class="tab checked:text-primary"
						value={authMode}
						role="tab"
						aria-label={getAuthModeLabel(authMode)}
						bind:group={mode} />
					<div class="tab-content px-6 py-3">
						<AuthForm {mode} {registeredEmail} onAccountCreated={handleAccountCreated} />
					</div>
				{/each}
			</div>
		</section>
	</section>
</main>

{#snippet pendingVerification()}
	<p class="leading-relaxed">
		We've sent a verification link to
		<span class="font-semibold text-neutral">{registeredEmail}</span>. Open the link to activate
		your account, then sign in to start practicing.
	</p>
	<p class="mt-3 text-sm text-base-content/75">
		<Info class="inline" size="1em" />
		Didn't get the email? Check your spam folder or send a new link above.
	</p>
{/snippet}
