<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { goto } from "$app/navigation";
	import WatermarkBackground from "#lib/components/WatermarkBackground.svelte";
	import { closeModal, openModal } from "#lib/components/Modal.svelte";
	import {
		getAllAuthModes,
		getAuthModeHeadingLabel,
		getAuthModeLabel,
		getAuthModeSubheadingLabel,
		type AuthMode
	} from "./auth-mode";
	import PlatformOverview from "./PlatformOverview.svelte";
	import EmailAndPasswordMethod from "./EmailAndPasswordMethod.svelte";
	import SignInSocialMethods from "./SignInSocialMethods.svelte";
	import NewPasswordForm from "./NewPasswordForm.svelte";

	let mode = $state<AuthMode>("sign-in");
	let registeredEmail = $derived(page.url.searchParams.get("registered-email") ?? "");

	async function handleAccountCreated(email: string) {
		await goto(resolve(`/(public)/sign-in?registered-email=${email}`), {
			replace: true
		});
		mode = "sign-in";
	}

	onMount(() => {
		const error = page.url.searchParams.get("error");
		const token = page.url.searchParams.get("token");

		if (error) {
			let title: string;
			let content: string;

			switch (error.toUpperCase()) {
				case "ACCESS_DENIED":
					title = "Access Denied";
					content = "You have denied access to your third-party account.";
					break;

				case "STATE_MISMATCH":
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
					content = "The link has been expired or contains invalid token.";
					break;

				default:
					title = "Unhandled Sign in error";
					content = "Please try again.";
					break;
			}

			openModal({ title, content, primaryButton: "Close" });
		}

		if (token) {
			openModal({
				title: "Reset password",
				content: {
					component: NewPasswordForm,
					props: {
						token,
						email: registeredEmail,
						onReset: async () => {
							closeModal();
							openModal({
								title: "Change password",
								content: "Your password was successfully changed.",
								primaryButton: {
									text: "Close",
									onclick: () => {
										goto(resolve(`/(public)/sign-in?registered-email=${registeredEmail}`), {
											replace: true
										});
									}
								}
							});
						}
					}
				}
			});
		}
	});
</script>

<svelte:head>
	<title>Sign in | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Sign In" />
</svelte:head>

<main
	id="main-content"
	class="flex w-full justify-center overflow-y-auto [--glass-blur:4px] lg:h-full"
	data-theme="light">
	<WatermarkBackground />

	<section
		class="z-1 flex w-full max-w-6xl flex-col items-center justify-between gap-12 px-6 py-2 lg:flex-row lg:px-16">
		<PlatformOverview />

		<section
			class="flex w-full max-w-md flex-col items-center gap-2 rounded-box glass px-8 py-6 shadow-md">
			<div class="flex flex-col items-center gap-3 text-center">
				<div class="flex flex-col gap-1">
					<h2 class="text-2xl font-semibold text-neutral">{getAuthModeHeadingLabel(mode)}</h2>
					<p class="text-sm text-neutral/65">{getAuthModeSubheadingLabel(mode)}</p>
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
				{/each}

				<div class="tab-content block px-6 py-3">
					<EmailAndPasswordMethod
						{mode}
						{registeredEmail}
						onAccountCreated={handleAccountCreated} />
				</div>
			</div>

			{#if mode !== "change-password"}
				<div class="divider mt-0 text-base-content/75">OR</div>
				<SignInSocialMethods />
			{/if}
		</section>
	</section>
</main>
