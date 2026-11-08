<script lang="ts">
	import { Pencil, Target } from "@lucide/svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import ChangeBandTarget from "../ChangeBandTarget.svelte";

	type Props = { bandTarget: number; overall: number };
	let { bandTarget, overall }: Props = $props();

	const targetReached = $derived(overall >= bandTarget);

	function openTargetModal() {
		openModal({
			title: "Change target band",
			content: { component: ChangeBandTarget, props: { bandTarget } }
		});
	}
</script>

{#if bandTarget > 0}
	<div class="flex items-center gap-1.5">
		<Target class="size-4 shrink-0 text-primary" />
		<span class="text-sm font-semibold">Target {bandTarget.toFixed(1)}</span>
		<button
			class="btn btn-circle btn-ghost btn-xs"
			aria-label="Change target band"
			onclick={openTargetModal}>
			<Pencil class="size-3.5" />
		</button>
	</div>
	{#if targetReached}
		<span class="badge self-start badge-xs font-semibold badge-success">Target reached</span>
	{:else}
		<p class="text-xs text-base-content/75">
			{(bandTarget - overall).toFixed(1)} band away from your target
		</p>
	{/if}
{:else}
	<p class="text-xs text-base-content/75">No target set yet</p>
	<button class="btn self-start btn-outline btn-primary btn-xs" onclick={openTargetModal}>
		<Target class="size-3.5" />
		Set target band
	</button>
{/if}
