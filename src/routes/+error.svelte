<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { BookOpen, House, MessageCircle, RotateCcw } from "@lucide/svelte";
</script>

<svelte:head>
	<title>Page Not Found | IELTS Writing Practice Platform</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class="flex h-full w-full max-w-xl flex-col items-center justify-center gap-6 self-center bg-base-100 px-4 py-12 text-center">
	<!-- Error code with subtle animation -->
	<div class="flex flex-col items-center gap-2" aria-hidden="true">
		<span class="text-7xl font-extrabold text-primary">{page.status}</span>
		<div class="h-px w-24 bg-primary/30"></div>
	</div>

	<!-- Message -->
	<div class="flex flex-col items-center gap-3">
		<h1 class="text-2xl font-semibold text-base-content">Page Not Found</h1>
		<p class="max-w-xs text-sm text-base-content/70">
			The page you're looking for doesn't exist or has been moved.
		</p>
	</div>

	<!-- Action buttons -->
	<div class="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
		<button class="btn btn-wide gap-2 btn-primary md:order-2" onclick={() => history.back()}>
			<RotateCcw size="1.125em" aria-hidden="true" />
			Go Back
		</button>
		<a class="btn btn-wide gap-2 btn-outline" href={resolve("/(public)/(dashboard)")}>
			<House size="1.125em" aria-hidden="true" />
			Go to Dashboard
		</a>
	</div>

	<!-- Helpful shortcuts -->
	<nav class="w-full max-w-xs" aria-label="Quick shortcuts">
		<p class="mb-2 text-xs font-medium tracking-wider text-base-content/50 uppercase">
			Quick shortcuts
		</p>
		<div class="grid grid-cols-2 gap-2">
			<a
				class="btn justify-center gap-1.5 btn-ghost btn-sm"
				href={resolve("/(protected)/practice/task/[taskId=taskId]", { taskId: "1" })}>
				<BookOpen size="1em" aria-hidden="true" />
				<span>Task 1</span>
			</a>
			<a
				class="btn justify-center gap-1.5 btn-ghost btn-sm"
				href={resolve("/(protected)/practice/task/[taskId=taskId]", {
					taskId: "2"
				})}>
				<MessageCircle size="1em" aria-hidden="true" />
				<span>Task 2</span>
			</a>
		</div>
	</nav>
</main>
