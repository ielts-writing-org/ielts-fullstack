<script lang="ts">
	import { Clock } from "@lucide/svelte";
	import { onMount, untrack } from "svelte";
	import { getRemainingSeconds } from "#lib/domain/ielts-timing.ts";

	type Props = {
		endAt: number;
		onTimedUp: () => void;
	};

	const props: Props = $props();

	let timerInterval = $state<ReturnType<typeof setInterval>>();
	let timeRemaining = $state(untrack(() => getRemainingSeconds(props.endAt)));
	let fired = false;

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = undefined;
		}
	}

	function tick() {
		timeRemaining = getRemainingSeconds(props.endAt);

		if (timeRemaining === 0 && !fired) {
			fired = true;
			stopTimer();
			props.onTimedUp();
		}
	}

	onMount(() => {
		tick();
		timerInterval = setInterval(tick, 1000);

		// Hidden tabs throttle timers; re-sync the moment the tab is visible again.
		const resync = () => {
			if (document.visibilityState === "visible") {
				tick();
			}
		};
		document.addEventListener("visibilitychange", resync);
		window.addEventListener("focus", resync);

		return () => {
			stopTimer();
			document.removeEventListener("visibilitychange", resync);
			window.removeEventListener("focus", resync);
		};
	});
</script>

<div
	class={[
		"badge rounded-field font-mono text-xs",
		timeRemaining <= 60 ? "badge-error" : "badge-dash badge-primary",
		timeRemaining <= 60 && timeRemaining > 0 && "animate-pulse"
	]}>
	<Clock size="1em" />
	<span>{formatTime(timeRemaining)}</span>
</div>
