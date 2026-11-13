<script lang="ts">
	import { page } from "$app/state";
	import { untrack } from "svelte";
	import { authClient } from "#lib/auth/auth-client.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import GitHub from "#lib/components/icons/GitHub.svelte";

	let signingIn = $state<boolean>(false);

	async function handleSignInSocial(provider: "github") {
		signingIn = true;

		const result = await authClient.signIn.social({
			provider: provider,
			callbackURL: page.url.origin
		});

		if (result.error) {
			untrack(() => {
				openModal({
					title: {
						text: `Unable to Sign in`,
						color: "error"
					},
					content: {
						snippet: signInErrorSnippet,
						args: {
							errorMessage: result.error.message,
							errorCode: result.error.code,
							statusCode: result.error.status,
							status: result.error.statusText
						}
					},
					primaryButton: "Close"
				});
			});
		}

		signingIn = false;
	}
</script>

<div
	class="tooltip absolute tooltip-bottom top-1 right-1 z-100 flex flex-col items-center bg-base-100 tooltip-error"
	data-tip="Planned to remove">
	<button
		class="btn btn-wide btn-outline btn-neutral hover:shadow-md"
		disabled={signingIn}
		onclick={() => handleSignInSocial("github")}>
		<GitHub class="h-5 w-5" />
		Continue with GitHub
	</button>
</div>

{#snippet signInErrorSnippet(props: {
	errorMessage: string | undefined;
	errorCode: string | undefined;
	status: string;
	statusCode: number;
})}
	<p class="font-semibold text-error">
		{props.errorMessage ?? "There was an unexpected error while signing you in"}
	</p>
	<p class="mt-4">
		{#if props.errorCode}
			<span class="font-semibold">Error Code:</span>
			{props.errorCode}
			<br />
		{/if}
		<span class="font-semibold">Status:</span>
		{props.statusCode} - {props.status}
	</p>
{/snippet}
