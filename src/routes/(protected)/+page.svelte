<script lang="ts">
	import Ads from "./Ads.svelte";
	import PracticeOptions from "./PracticeOptions.svelte";
	import Progress from "./Progress.svelte";
	import RecentPractices from "./RecentPractices.svelte";
	import RecommendedTask from "./RecommendedTask.svelte";

	const { data } = $props();
</script>

<svelte:head>
	<title>Dashboard | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Dashboard" />
</svelte:head>

<main class="w-full flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-9">
	<RecommendedTask taskInfo={data.recommendedTask} />

	<div class="my-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
		<h2 class="font-semibold">What do you want to practice?</h2>
		<span class="text-xs text-base-content/75">Select an IELTS Writing format to begin</span>
	</div>

	<section class="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
		<PracticeOptions practiceOptions={data.practiceOptions} />
		<Progress criteria={data.criteria} />
	</section>

	<section class="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
		<RecentPractices practiceSessions={data.practices} />
		<Ads />
	</section>
</main>
