<script lang="ts">
	import { resolve } from "$app/paths";
	import { Eye, EyeOff, LockKeyhole, Mail, UserPen } from "@lucide/svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import { authClient } from "#lib/auth/auth-client.ts";
	import type { AuthMode } from "./auth-mode";
	import AuthError from "./AuthError.svelte";
	import { page } from "$app/state";

	type Props = {
		mode: AuthMode;
		registeredEmail: string | undefined;
		onAccountCreated: (email: string) => unknown;
	};

	const props: Props = $props();

	let name = $state("");
	let email = $derived(props.registeredEmail ?? "");
	let password = $state("");
	let showPassword = $state(false);
	let rememberMe = $state(false);

	let signingIn = $state(false);
	let pendingState = $state<AuthMode | null>(null);

	async function handleAuthSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (pendingState !== null) {
			return;
		}

		if (props.mode === "sign-in") {
			await signInWithEmail();
		} else {
			await signUpWithEmail();
		}
	}

	async function signInWithEmail() {
		pendingState = "sign-in";
		try {
			const result = await authClient.signIn.email({
				email,
				password,
				rememberMe,
				callbackURL: page.url.href
			});

			if (result.error) {
				return openModal({
					title: { text: "Unable to sign in", color: "error" },
					content: {
						component: AuthError,
						props: {
							status: result.error.statusText,
							statusCode: result.error.status,
							errorCode: result.error.code,
							errorMessage: result.error.message
						}
					},
					primaryButton: "Close"
				});
			}
		} catch (e) {
			openModal({
				title: { text: "Unable to sign up", color: "error" },
				content: `Unable to sign up: ${e}`,
				primaryButton: "Close"
			});
		} finally {
			pendingState = null;
		}
	}

	async function signUpWithEmail() {
		pendingState = "sign-up";
		try {
			await authClient.signUp.email({ name, email, password });

			props.onAccountCreated(email);
			showPassword = false;
		} catch (e) {
			openModal({
				title: { text: "Unable to sign up", color: "error" },
				content: `Unable to sign up: ${e}`,
				primaryButton: "Close"
			});
		} finally {
			pendingState = null;
		}
	}
</script>

<form class="group flex w-full flex-col gap-2" onsubmit={handleAuthSubmit}>
	{#if props.mode === "sign-up"}
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Name</legend>
			<label class="validator input">
				<UserPen class="h-4 w-4 shrink-0 text-neutral/50" aria-hidden="true" />
				<input type="text" placeholder="John Doe" autocomplete="name" required bind:value={name} />
			</label>
			<p class="validator-hint hidden">Please enter your name.</p>
		</fieldset>
	{/if}

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Email</legend>
		<label class="validator input">
			<Mail class="h-4 w-4 shrink-0 text-neutral/50" aria-hidden="true" />
			<input
				type="email"
				placeholder="you@example.com"
				autocomplete="email"
				required
				bind:value={email} />
		</label>
		<p class="validator-hint hidden">Please enter a valid email address.</p>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Password</legend>
		<label class="validator input">
			<LockKeyhole class="h-4 w-4 shrink-0 text-neutral/50" aria-hidden="true" />
			<input
				type={showPassword ? "text" : "password"}
				placeholder={props.mode === "sign-in" ? "Enter your password" : "Create a password"}
				autocomplete={props.mode === "sign-in" ? "current-password" : "new-password"}
				minlength={props.mode === "sign-up" ? 8 : undefined}
				required
				bind:value={password} />
			<button
				type="button"
				class="btn btn-circle btn-ghost btn-xs"
				aria-label={showPassword ? "Hide password" : "Show password"}
				aria-pressed={showPassword}
				onclick={() => (showPassword = !showPassword)}>
				{#if showPassword}
					<EyeOff class="h-4 w-4" aria-hidden="true" />
				{:else}
					<Eye class="h-4 w-4" aria-hidden="true" />
				{/if}
			</button>
		</label>
		<p class="validator-hint hidden">
			{props.mode === "sign-up"
				? "Password must be at least 8 characters."
				: "Please enter your password."}
		</p>
	</fieldset>

	{#if props.mode === "sign-in"}
		<fieldset class="fieldset">
			<label class="label">
				<input
					type="checkbox"
					class="checkbox checkbox-sm checkbox-primary"
					bind:checked={rememberMe} />
				Remember me
			</label>
		</fieldset>
	{/if}

	<p class="text-center text-xs text-neutral/60">
		By {props.mode === "sign-up" ? "signing up" : "signing in"}, you agree to our
		<span class="mt-1 block">
			<a class="link font-medium link-primary" href={resolve("/(public)/(docs)/terms-of-service")}>
				Terms of Service
			</a>
			and
			<a class="link font-medium link-primary" href={resolve("/(public)/(docs)/privacy-policy")}>
				Privacy Policy
			</a>
		</span>
	</p>

	<button
		type="submit"
		class="btn w-full btn-primary group-invalid:btn-disabled"
		disabled={signingIn || pendingState !== null}>
		{#if pendingState === "sign-in"}
			Signing in...
		{:else if pendingState === "sign-up"}
			Creating account...
		{:else if props.mode === "sign-in"}
			Sign in
		{:else}
			Create account
		{/if}
	</button>
</form>
