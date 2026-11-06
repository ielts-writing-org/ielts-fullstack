<script lang="ts">
	import { closeModal } from "#lib/components/Modal.svelte";
	import { changeSessionName } from "#lib/remotes/command/change-session-name.remote.js";
	import type { SessionItem } from "./utils.ts";

	type Props = { session: SessionItem; onSaved?: () => void | Promise<void> };
	let { session, onSaved }: Props = $props();

	let draft = $state<string | undefined>(undefined);
	const name = $derived(draft ?? session.name);

	async function save() {
		const newName = name.trim();
		if (!newName) {
			return;
		}

		await changeSessionName({ practiceSessionId: session.id, newName });
		await onSaved?.();
		await closeModal();
	}
</script>

<p class="mb-3 text-xs text-base-content/75">Enter a new name for this practice session.</p>
<input
	class="input w-full"
	value={name}
	oninput={(event) => (draft = event.currentTarget.value)}
	maxlength={64}
	placeholder="Practice session name"
	aria-label="New session name" />

<div class="modal-action">
	<button type="button" class="btn btn-error btn-ghost" onclick={closeModal}>Cancel</button>
	<button type="button" class="btn btn-primary" onclick={save}>
		{changeSessionName.pending > 0 ? "Saving..." : "Save"}
	</button>
</div>
