<script lang="ts">
	import { resolve } from "$app/paths";
	import { LibraryBig, PenLine } from "@lucide/svelte";
	import About from "./About.svelte";
	import PracticeOptions from "./PracticeOptions.svelte";
	import Statistics from "./Statistics.svelte";
	import RecentPracticeSessions from "./RecentPracticeSessions.svelte";
	import PreviousPracticeSession from "./PreviousPracticeSession.svelte";
	import ActivityStats from "./ActivityStats.svelte";

	const { data } = $props();
</script>

<svelte:head>
	<title>Dashboard | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Dashboard" />
</svelte:head>

<main id="main-content" class="w-full flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-9">
	{#if data.recentPracticeSession}
		<PreviousPracticeSession
			practiceSession={data.recentPracticeSession.practiceSession}
			task={data.recentPracticeSession.task} />
	{:else}
		<section
			class="rounded-box border border-dashed border-base-content/20 bg-base-100 px-4 py-6 text-center"
			aria-label="Welcome">
			<PenLine class="mx-auto size-8 text-primary" />
			<h2 class="mt-2 font-bold">Welcome to your writing practice</h2>
			<p class="mx-auto mt-1 max-w-xl text-xs text-base-content/75">
				Pick a task format below, write your response with the built-in editor and AI tutor, and get
				an estimated band score with detailed feedback.
			</p>
		</section>
	{/if}

	<div class="my-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div class="min-w-0">
			<h1 class="font-semibold">What do you want to practice?</h1>
			<p class="text-xs text-base-content/75">
				Select an IELTS Writing format to begin, or reopen a task you saved earlier.
			</p>
		</div>
		<a class="btn btn-outline btn-primary btn-sm sm:shrink-0" href={resolve("/(protected)/tasks")}>
			<LibraryBig size="1em" />
			Task Library
		</a>
	</div>

	<section class="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
		<PracticeOptions practiceOptions={data.practiceOptions} />
		<Statistics
			statistics={data.statistics}
			bandTarget={data.profile?.bandTarget ?? 0}
			trend={data.bandTrend}
			evaluatedCount={data.activity.evaluated} />
	</section>

	<section class="mt-4">
		<ActivityStats activity={data.activity} streakDays={data.streakDays} />
	</section>

	<section class="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
		<RecentPracticeSessions practiceSessions={data.practices} />
		<About />
	</section>
</main>
