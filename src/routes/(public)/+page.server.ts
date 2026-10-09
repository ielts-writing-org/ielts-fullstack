import type { PageServerLoad } from "./$types";

export const load = (async () => {
	const sessions = [
		{
			task: "Task 2",
			title: "Opinion: Remote Working Impact",
			meta: "Yesterday",
			area: "Task Response",
			band: "6.5"
		},
		{
			task: "Task 1",
			title: "Bar Chart: Energy Consumption",
			meta: "3 days ago",
			area: "Grammar Range",
			band: "7.0"
		},
		{
			task: "Task 2",
			title: "Discussion: University Tuition Fees",
			meta: "5 days ago",
			area: "Coherence",
			band: "6.5"
		}
	];

	const criteria = [
		{
			name: "Task Response / Achievement",
			direction: "up",
			score: "6.5",
			bar: "w-[73%] bg-[#5a50ea]",
			scoreColor: "text-[#5045eb]",
			note: "Main idea clear; expand supporting arguments."
		},
		{
			name: "Coherence & Cohesion",
			direction: "steady",
			score: "7.0",
			bar: "w-[78%] bg-[#8841ea]",
			scoreColor: "text-[#5045eb]",
			note: "Logical paragraphing; diverse linking words."
		},
		{
			name: "Lexical Resource",
			direction: "up",
			score: "7.0",
			bar: "w-[78%] bg-[#07966e]",
			scoreColor: "text-[#039b78]",
			note: "Good academic collocations; reduce repetition."
		},
		{
			name: "Grammar Range & Accuracy",
			direction: "up",
			score: "6.0",
			bar: "w-[60%] bg-[#e58600]",
			scoreColor: "text-[#e68500]",
			note: "Accurate simple sentences; watch comma splices."
		}
	];

	return {
		sessions: sessions,
		criteria: criteria
	};
}) satisfies PageServerLoad;
