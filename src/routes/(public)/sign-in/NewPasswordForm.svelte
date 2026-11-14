<script lang="ts">
	import { Eye, EyeOff, Info, LockKeyhole, Mail } from "@lucide/svelte";
	import { closeModal, openModal } from "#lib/components/Modal.svelte";
	import { authClient } from "#lib/auth/auth-client.ts";
	import AuthError from "./AuthError.svelte";

	type Props = {
		token: string;
		email: string;
		onReset: () => unknown;
	};

	const props: Props = $props();

	let password = $state("");
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let resetting = $state(false);

	async function handleResetSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (resetting) {
			return;
		}

		resetting = true;
		try {
			const result = await authClient.resetPassword({
				newPassword: password,
				token: props.token
			});

			if (result.error) {
				if (result.error.code === "INVALID_TOKEN") {
					closeModal();
					return openModal({
						title: { text: "Unable to reset password", color: "error" },
						content: "The link has been expired or contains invalid token. Please try again.",
						primaryButton: "Close"
					});
				}

				return openModal({
					title: { text: "Unable to reset password", color: "error" },
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

			await props.onReset();
		} catch (e) {
			openModal({
				title: { text: "Unable to reset password", color: "error" },
				content: `Unable to reset password: ${e}`,
				primaryButton: "Close"
			});
		} finally {
			resetting = false;
		}
	}

	function handleCancel(event: MouseEvent) {
		event.preventDefault();

		password = "";
		showPassword = false;
		showConfirmPassword = false;

		closeModal();
	}
</script>

<form class="group mt-5 flex w-full flex-col gap-2" onsubmit={handleResetSubmit}>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">Email</legend>
		<label class="input w-full">
			<Mail class="h-4 w-4 shrink-0 text-neutral/50" aria-hidden="true" />
			<input
				type="email"
				placeholder="you@example.com"
				autocomplete="email"
				readonly
				value={props.email} />
		</label>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">New password</legend>
		<label class="validator input w-full">
			<LockKeyhole class="h-4 w-4 shrink-0 text-neutral/50" aria-hidden="true" />
			<input
				type={showPassword ? "text" : "password"}
				placeholder="Create a new password"
				autocomplete="new-password"
				minlength={8}
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
		<p class="validator-hint hidden">Password must be at least 8 characters.</p>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">Confirm new password</legend>
		<label class="validator input w-full">
			<LockKeyhole class="h-4 w-4 shrink-0 text-neutral/50" aria-hidden="true" />
			<input
				type={showConfirmPassword ? "text" : "password"}
				placeholder="Re-enter your new password"
				autocomplete="new-password"
				pattern={password}
				required />
			<button
				type="button"
				class="btn btn-circle btn-ghost btn-xs"
				aria-label={showConfirmPassword ? "Hide password" : "Show password"}
				aria-pressed={showConfirmPassword}
				onclick={() => (showConfirmPassword = !showConfirmPassword)}>
				{#if showConfirmPassword}
					<EyeOff class="h-4 w-4" aria-hidden="true" />
				{:else}
					<Eye class="h-4 w-4" aria-hidden="true" />
				{/if}
			</button>
		</label>
		<p class="validator-hint hidden">Passwords do not match yet.</p>
	</fieldset>

	<p class="text-sm text-base-content/75">
		<Info class="inline-block h-4 w-4 align-text-bottom" />
		Changing your password will sign you out of all sessions across devices.
	</p>

	<div class="modal-action">
		<button
			type="reset"
			class="btn btn-ghost btn-error"
			disabled={resetting}
			onclick={handleCancel}>
			Cancel
		</button>

		<button type="submit" class="btn btn-primary group-invalid:btn-disabled" disabled={resetting}>
			{#if resetting}
				Resetting...
			{:else}
				Reset password
			{/if}
		</button>
	</div>
</form>
