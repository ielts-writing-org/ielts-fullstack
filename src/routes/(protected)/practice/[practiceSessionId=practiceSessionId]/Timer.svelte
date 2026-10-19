<script lang="ts">
	import { Clock } from "@lucide/svelte";
	import { onDestroy, onMount } from "svelte";

	type Props = {
		endAt: number;
		onTimedUp: () => void;
	};

	const props: Props = $props();

	let timerInterval = $state<ReturnType<typeof setInterval>>();

	let timeRemaining = $derived<number>(calculateRemainingTime(props.endAt));

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}

	function startTimer() {
		if (timerInterval) {
			return;
		}

		timerInterval = setInterval(() => {
			if (timeRemaining <= 1) {
				clearInterval(timerInterval);
				timerInterval = undefined;
				props.onTimedUp();
				timeRemaining = 0;
			} else {
				timeRemaining = calculateRemainingTime(props.endAt);
			}
		}, 1000);
	}

	function calculateRemainingTime(time: number) {
		return time - Math.floor(Date.now() / 1000);
	}

	onMount(async () => {
		startTimer();
	});

	onDestroy(() => {
		if (timerInterval) {
			clearInterval(timerInterval);
		}
	});
</script>

<div
	class={[
		"textxs badge rounded-field font-mono",
		timeRemaining <= 60 ? "badge-error" : "badge-dash badge-primary",
		timeRemaining <= 60 && timeRemaining > 0 && "animate-pulse"
	]}>
	<Clock size="1em" />
	<span>{timeRemaining >= 0 ? formatTime(timeRemaining) : formatTime(0)}</span>
</div>
