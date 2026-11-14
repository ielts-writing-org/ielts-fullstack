<script lang="ts">
	import { untrack } from "svelte";
	import { authClient } from "#lib/auth/auth-client.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import GitHub from "#lib/components/icons/GitHub.svelte";
	import AuthError from "./AuthError.svelte";

	let signingIn = $state<boolean>(false);

	async function handleSignInSocial(provider: "github") {
		signingIn = true;

		const result = await authClient.signIn.social({ provider: provider });

		if (result.error) {
			untrack(() => {
				openModal({
					title: {
						text: `Unable to Sign in`,
						color: "error"
					},
					content: {
						component: AuthError,
						props: {
							statusCode: result.error.status,
							status: result.error.statusText,
							errorCode: result.error.code,
							errorMessage: result.error.message
						}
					},
					primaryButton: "Close"
				});
			});
		}

		signingIn = false;
	}
</script>

<div class="flex flex-col items-center">
	<button
		class="btn btn-wide btn-outline btn-neutral hover:shadow-md"
		disabled={signingIn}
		onclick={() => handleSignInSocial("github")}>
		<GitHub class="h-5 w-5" />
		Continue with GitHub
	</button>
</div>
