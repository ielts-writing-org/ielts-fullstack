<script lang="ts">
	import { page } from "$app/state";
	import { untrack } from "svelte";
	import { PenLine } from "@lucide/svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import { getProfile } from "#lib/remotes/profile.remote.ts";
	import About from "./About.svelte";
	import PracticeOptions from "./PracticeOptions.svelte";
	import Progress from "./Progress.svelte";
	import RecentPracticeSessions from "./RecentPracticeSessions.svelte";
	import ActivityStats from "./ActivityStats.svelte";
	import ChangeBandTarget from "../ChangeBandTarget.svelte";

	const { data } = $props();

	const firstName = $derived((page.data.user?.name ?? "there").split(" ")[0]);
	const isNewUser = $derived(data.activity.totalSessions === 0);
	const profileQuery = getProfile();

	$effect(() => {
		if (profileQuery.ready && profileQuery.current?.bandTarget === null) {
			untrack(() =>
				openModal({
					title: "Welcome to IELTS Writing Practice Platform",
					content: { component: ChangeBandTarget, props: { bandTarget: 0 } }
				})
			);
		}
	});
</script>

<svelte:head>
	<title>Dashboard | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Dashboard" />
</svelte:head>

<main id="main-content" class="w-full flex-1 overflow-y-auto bg-base-100 p-3 sm:p-4 lg:px-9">
	<div class="min-w-0">
		<p class="text-xs font-semibold text-base-content/75">
			{isNewUser ? `Welcome, ${firstName}.` : `Welcome back, ${firstName}.`}
		</p>
		<h1 class="mt-0.5 flex items-center gap-2 font-semibold">
			<PenLine class="shrink-0 text-primary" size="1em" />
			What do you want to practice today?
		</h1>
	</div>

	<section class="my-4">
		<ActivityStats activity={data.activity} streakDays={data.streakDays} />
	</section>

	<section
		class="mt-4 grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
		<PracticeOptions practiceOptions={data.practiceOptions} />
		<Progress
			statistics={data.statistics}
			bandTarget={profileQuery.current?.bandTarget ?? 0}
			trend={data.bandTrend}
			evaluatedCount={data.activity.evaluated} />
	</section>

	<section class="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
		<RecentPracticeSessions
			practiceSessions={data.practices}
			bandTarget={profileQuery.current?.bandTarget ?? 0} />
		<About />
	</section>
</main>
