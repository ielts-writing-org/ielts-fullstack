<script lang="ts">
	import { closeModal } from "#lib/components/Modal.svelte";
	import { invalidate } from "$app/navigation";
	import { saveBandTarget } from "./save-band-target.remote";

	type Props = {
		bandTarget: number;
	};

	let { bandTarget = $bindable(0) }: Props = $props();

	async function handleSave() {
		await saveBandTarget({ bandTarget });
		await invalidate("data:profile");
		await closeModal();
	}

	async function handleCancel() {
		await closeModal();
	}
</script>

<p class="mb-4">Set your target band:</p>
<div class="w-full">
	<input
		class="range w-full range-primary range-sm"
		type="range"
		min="0"
		max="9"
		step="0.5"
		bind:value={bandTarget} />
	{const range = new Array(10)}
	<div class="mt-2 flex justify-between px-2.5 text-xs">
		{#each range}
			<span>|</span>
		{/each}
	</div>
	<div class="mt-2 flex justify-between px-2.5 text-xs">
		{#each range, i}
			<span>{i}</span>
		{/each}
	</div>
</div>

<div class="modal-action">
	<button class="btn btn-primary" onclick={handleSave}>Save</button>
	<button class="btn btn-ghost btn-error" onclick={handleCancel}>Cancel</button>
</div>
