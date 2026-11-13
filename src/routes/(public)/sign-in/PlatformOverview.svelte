<script lang="ts">
	import { ChartSpline, Check, MessagesSquare, Sparkles, Timer } from "@lucide/svelte";

	const FEATURES = [
		{
			description: "Get estimated band scores and feedback on all four IELTS writing criteria.",
			icon: Check,
			title: "AI Writing Evaluation"
		},
		{
			description: "Discuss your writing and clarify mistakes through interactive AI chat.",
			icon: MessagesSquare,
			title: "Conversational AI"
		},
		{
			description: "Practice Academic Task 1 with image-based prompts.",
			icon: ChartSpline,
			title: "Visual Task 1 Practice"
		},
		{
			description: "Choose timed or free practice for Task 1 and Task 2.",
			icon: Timer,
			title: "Flexible Practice"
		}
	];
</script>

<div class="flex flex-col gap-8 lg:max-w-xl">
	<div
		class="badge rounded-full badge-xs font-semibold tracking-wider uppercase badge-warning sm:text-xs sm:badge-md">
		<Sparkles class="h-4 w-4" />
		AI-Powered IELTS Academic Writing Tutor
	</div>

	<div class="flex flex-col gap-4">
		<h1
			class="text-3xl leading-tight font-black tracking-tight text-neutral sm:text-4xl lg:text-5xl">
			Achieve Your Target <div class="text-primary">
				IELTS Writing <span class="text-rotate">
					<span>
						<span class="text-warning">Band Score</span>
						<span class="bg-warning text-warning-content">Band Score</span>
					</span>
				</span>
			</div>
		</h1>
		<p class="leading-relaxed text-neutral/75 sm:text-lg">
			Practice IELTS Writing Task 1 and Task 2 with conversational AI feedback that helps you
			evaluate your responses, understand your mistakes, and improve your writing through targeted
			guidance.
		</p>
	</div>

	<!-- Feature List (Flexbox) -->
	<div class="flex flex-col flex-wrap gap-4 sm:flex-row">
		{#each FEATURES as feature (feature.title)}
			<div
				class="flex min-w-60 flex-1 items-start gap-4 rounded-box glass p-5 shadow-sm transition-shadow hover:shadow-md sm:w-[calc(50%-0.5rem)]">
				<div
					class="grid h-10 w-10 shrink-0 place-items-center rounded-box bg-primary/10 font-bold text-primary">
					<feature.icon class="h-5 w-5" />
				</div>
				<div class="flex flex-col gap-1">
					<h3 class="text-sm font-bold text-primary">{feature.title}</h3>
					<p class="text-xs leading-relaxed text-neutral/65">{feature.description}</p>
				</div>
			</div>
		{/each}
	</div>
</div>
