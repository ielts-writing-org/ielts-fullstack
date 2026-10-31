<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { LibraryBig, PenLine } from "@lucide/svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import About from "./About.svelte";
	import PracticeOptions from "./PracticeOptions.svelte";
	import Statistics from "./Statistics.svelte";
	import RecentPracticeSessions from "./RecentPracticeSessions.svelte";
	import ActivityStats from "./ActivityStats.svelte";
	import ChangeBandTarget from "../ChangeBandTarget.svelte";

	const { data } = $props();

	const firstName = $derived((page.data.user?.name ?? "there").split(" ")[0]);
	const isNewUser = $derived(data.activity.totalSessions === 0);

	const ONBOARDING_TARGET_KEY = "onboarding-target-band-dismissed";

	// First-visit nudge: without a target band the Progress card has nothing to
	// compare against. Shown once per browser, then never again.
	$effect(() => {
		if (data.profile?.bandTarget !== 0) {
			return;
		}

		if (localStorage.getItem(ONBOARDING_TARGET_KEY)) {
			return;
		}

		localStorage.setItem(ONBOARDING_TARGET_KEY, "1");
		openModal({
			title: "Set your target band",
			content: { component: ChangeBandTarget, props: { bandTarget: 0 } }
		});
	});
</script>

<svelte:head>
	<title>Dashboard | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Dashboard" />
</svelte:head>

<main id="main-content" class="w-full flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-9">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="min-w-0">
			<p class="text-xs font-semibold text-base-content/75">
				{isNewUser ? `Welcome, ${firstName}.` : `Welcome back, ${firstName}.`}
			</p>
			<h1 class="mt-0.5 flex items-center gap-2 font-semibold sm:text-lg">
				<PenLine class="size-5 shrink-0 text-primary" />
				What do you want to practice?
			</h1>
		</div>
		<a class="btn btn-outline btn-primary btn-sm sm:shrink-0" href={resolve("/(protected)/tasks")}>
			<LibraryBig size="1em" />
			Task Library
		</a>
	</div>

	<section class="mt-4 grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
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
