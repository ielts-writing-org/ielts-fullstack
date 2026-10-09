<script lang="ts">
	import { resolve } from "$app/paths";
	import { ArrowRight, Check, ChevronRight, Clock3, MessageCircle, Sparkles } from "@lucide/svelte";

	const { data } = $props();
</script>

<svelte:head>
	<title>Dashboard | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Dashboard" />
</svelte:head>

<main class="w-full flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-9">
	<section
		class="flex min-h-24.5 w-full flex-col items-start justify-between gap-4 rounded-box border border-base-content/20 bg-base-100 px-4 py-3 hover:border-primary sm:flex-row sm:items-center sm:px-5"
		aria-label="Recommended practice">
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
				<span class="badge badge-soft badge-sm badge-primary">RECOMMENDED FOR YOU</span>
				<span class="font-semibold text-base-content/75">
					Focus Area: Task Response <span class="mx-1">•</span>
					Est. 40 min
				</span>
			</div>
			<h1 class="my-1.5 font-semibold">Task 2 - Opinion Essay: Community Service in High School</h1>
			<p class="max-w-3xl text-xs text-base-content/75">
				Your recent essays demonstrate strong lexical range (Band 7.0), but your arguments need
				deeper explanation and concrete examples to reach Band 7.5+ in Task Response.
			</p>
		</div>
		<button class="btn btn-primary">
			Practice this task
			<ArrowRight size="1em" />
		</button>
	</section>

	<div class="my-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
		<h2 class="font-semibold">What do you want to practice?</h2>
		<span class="text-xs text-base-content/75">Select an IELTS Writing format to begin</span>
	</div>

	<section class="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
		<div class="grid grid-cols-1 gap-3.5 md:grid-cols-2">
			<article
				class="flex min-h-60 flex-col overflow-hidden rounded-box border border-base-content/20 bg-base-100 p-4 hover:border-primary">
				<div class="flex justify-between gap-1.5 text-xs">
					<span class="badge rounded-box badge-soft badge-sm font-semibold badge-primary">
						TASK 1
					</span>
					<span class="flex items-center gap-1 text-base-content/75">
						<Clock3 size="1em" />
						20 mins • min 150 words
					</span>
				</div>
				<h3 class="mt-3 font-semibold">Academic Visual Report</h3>
				<p class="mb-3 truncate text-xs text-base-content/75">
					Summarize, describe, or explain visual data. Present an overview.
				</p>
				<span class="mb-1 text-xs font-semibold text-base-content/75">Supported Visual Types:</span>
				<div class="flex flex-wrap gap-1.5">
					<div class="badge badge-soft badge-xs">Line Graph</div>
					<div class="badge badge-soft badge-xs">Bar Chart</div>
					<div class="badge badge-soft badge-xs">Pie Chart</div>
					<div class="badge badge-soft badge-xs">Table</div>
					<div class="badge badge-soft badge-xs">Process Diagram</div>
					<div class="badge badge-soft badge-xs">Map Comparison</div>
					<div class="badge badge-soft badge-xs">Multiple Visuals</div>
				</div>
				<a
					class="btn mt-auto btn-outline btn-primary"
					href={resolve("/(protected)/practice/[taskId=taskId]", {
						taskId: "1"
					})}>
					Start Task 1 Practice <ArrowRight size="1em" />
				</a>
			</article>

			<article
				class="flex min-h-60 flex-col overflow-hidden rounded-box border border-base-content/20 bg-base-100 p-3.75 hover:border-primary">
				<div class="flex justify-between gap-1.5 text-xs">
					<span class="badge rounded-box badge-soft badge-sm font-semibold badge-primary">
						TASK 2
					</span>
					<span class="flex items-center gap-1 text-base-content/75">
						<Clock3 size={12} />
						40 mins • min 250 words
					</span>
				</div>
				<h3 class="mt-3 font-semibold">Academic Discursive Essay</h3>
				<p class="mb-3 truncate text-xs text-base-content/75">
					Write a formal academic essay presenting structured arguments.
				</p>
				<span class="mb-1 text-xs font-semibold text-base-content/75">
					Supported Question Types:
				</span>
				<div class="flex flex-wrap gap-1.5">
					<div class="badge badge-soft badge-xs">Opinion (Agree/Disagree)</div>
					<div class="badge badge-soft badge-xs">Discussion (Both Views)</div>
					<div class="badge badge-soft badge-xs">Advantages & Disadvantages</div>
					<div class="badge badge-soft badge-xs">Problems & Solutions</div>
					<div class="badge badge-soft badge-xs">Two-Part Direct Questions</div>
				</div>
				<a
					class="btn mt-auto btn-outline btn-primary"
					href={resolve("/(protected)/practice/[taskId=taskId]", {
						taskId: "2"
					})}>
					Start Task 2 Practice <ArrowRight size="1em" />
				</a>
			</article>
		</div>

		<aside
			class="flex flex-col gap-2 overflow-hidden rounded-box border border-base-content/20 bg-base-100 p-4 hover:border-primary">
			<div class="mb-2 flex justify-between">
				<div>
					<h2 class="font-semibold">Evaluation Result</h2>
					<p class="text-xs whitespace-nowrap text-base-content/75">
						IELTS assessment criteria breakdown across past sessions
					</p>
				</div>
				<span class="badge badge-soft badge-sm whitespace-nowrap badge-primary">
					AI Estimated Band: 6.5
				</span>
			</div>
			{#each data.criteria as criterion (criterion.name)}
				<div class="flex flex-col gap-1">
					<div class="flex justify-between text-sm">
						<a class="font-semibold" href={resolve("/(public)")}>
							{criterion.name}
						</a>
						<b class={criterion.scoreColor}>{criterion.score}</b>
					</div>
					<!-- TODO: Migrate to progress tag -->
					<div class="flex flex-col gap-1">
						<div class="h-1.25 overflow-hidden rounded bg-base-100">
							<span class={`block h-full rounded ${criterion.bar}`}></span>
						</div>
						<small class="text-xs text-base-content/75">{criterion.note}</small>
					</div>
				</div>
			{/each}
		</aside>
	</section>

	<section class="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
		<div class="rounded-box border border-base-content/20 bg-base-100 p-3.5 hover:border-primary">
			<div class="mb-2.5 flex items-center justify-between">
				<h2 class="text-sm font-semibold">Recent Practice Sessions</h2>
				<a class="flex items-center text-xs font-semibold text-primary" href={resolve("/(public)")}>
					View complete history <ChevronRight size={14} />
				</a>
			</div>
			{#each data.sessions as session (session.title)}
				<div
					class="mt-1.5 grid min-h-7.5 cursor-pointer grid-cols-[45px_minmax(0,1fr)_120px] items-center gap-1.5 rounded-box bg-base-200 px-2.5 text-xs hover:bg-base-300 sm:grid-cols-[45px_minmax(170px,1fr)_70px_120px]">
					<span class="badge rounded-box badge-soft badge-xs badge-primary">
						{session.task}
					</span>
					<span class="truncate font-semibold">{session.title}</span>
					<small class="hidden text-xs text-base-content/75 sm:block">{session.meta}</small>
					<span class="text-right text-xs">Overall band {session.band}</span>
				</div>
			{/each}
		</div>
		<div class="relative min-h-37.75 overflow-hidden rounded-box bg-[#10182e] p-4">
			<div class="flex gap-1 text-xs font-bold text-[#8293f2]">
				<MessageCircle size="1em" />
				AI TUTOR
			</div>
			<h2 class="mt-2 text-sm font-semibold text-white">Guidance While You Write</h2>
			<p class="max-w-[320px] text-xs text-white/50">
				Get contextual hints mapped to official IELTS criteria right as you construct paragraphs. No
				full essay rewrites - pure guided learning.
			</p>
			<div class="mt-6 flex flex-wrap gap-3 text-xs font-semibold">
				<span class="text-success"><Check size="1em" /> Sentence-level cues</span>
				<span class="text-warning"><Check size="1em" /> Socratic questions</span>
				<span class="text-info"><Check size="1em" /> 4-criteria checks</span>
			</div>
			<Sparkles class="absolute top-4 right-4 text-warning" size="1.5em" />
		</div>
	</section>
</main>
