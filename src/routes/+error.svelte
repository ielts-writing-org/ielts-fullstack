<script lang="ts">
	import { page } from "$app/state";
	import { Undo2 } from "@lucide/svelte";

	function getErrorDetail(statusNumber: number) {
		switch (statusNumber) {
			case 404:
				return {
					message: "Page Not Found",
					subMessage: "The page you're looking for doesn't exist or has been moved."
				};

			default:
				return {
					message: "Internal Error",
					subMessage: "The page you're looking for encountered an unhandled error."
				};
		}
	}
</script>

<svelte:head>
	<title>{getErrorDetail(page.status).message} | IELTS Writing Practice Platform</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class="flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 self-center bg-base-100 px-4 py-12 text-center">
	<!-- Error code with subtle animation -->
	<div class="flex flex-col items-center gap-2" aria-hidden="true">
		<span class="text-7xl font-extrabold text-primary">{page.error?.status}</span>
		<div class="h-px w-24 bg-primary/30"></div>
	</div>

	<!-- Message -->
	{const detail = getErrorDetail(page.status)}
	<div class="flex flex-col items-center gap-3">
		<h1 class="text-2xl font-semibold text-base-content">{detail.message}</h1>
		<p class="max-w-xs text-sm text-base-content/70">{detail.subMessage}</p>
	</div>

	<!-- Action buttons -->
	<div class="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
		<button class="btn btn-wide gap-2 btn-primary md:order-2" onclick={() => history.back()}>
			<Undo2 size="1.125em" aria-hidden="true" />
			Go Back
		</button>
	</div>
</main>
