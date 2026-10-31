import { ChartSpline, Check, MessagesSquare, Timer } from "@lucide/svelte";
import type { PageLoad } from "./$types";

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

export const load = (async () => {
	return { features: FEATURES };
}) satisfies PageLoad;
