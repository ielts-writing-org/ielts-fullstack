<script lang="ts">
	import { TriangleAlert } from "@lucide/svelte";
	import { closeModal } from "#lib/components/Modal.svelte";
	import { deleteTask } from "#lib/remotes/command/delete-task.remote.js";
	import type { getTaskDependants } from "#lib/remotes/query/get-task-dependants.remote.js";
	import { formatRelativeTime } from "#lib/utils/time.js";
	import { practiceHref, type TaskItem } from "./links.ts";

	type DependantSession = Awaited<ReturnType<typeof getTaskDependants>>["sessions"][number];

	type Props = {
		task: TaskItem;
		sessions: DependantSession[];
		onDeleted?: () => void | Promise<void>;
	};
	let { task, sessions, onDeleted }: Props = $props();

	const CONFIRM_PHRASE = "DELETE";

	let confirmPhrase = $state("");

	async function handleDelete() {
		if (sessions.length > 0 && confirmPhrase.trim() !== CONFIRM_PHRASE) {
			return;
		}

		await deleteTask({ taskId: task.id });
		await onDeleted?.();
		await closeModal();
	}
</script>

<p>
	You are about to permanently delete this task
	{#if sessions.length > 0}
		and its <span class="font-semibold">{sessions.length}</span>
		dependent practice {sessions.length === 1 ? "session" : "sessions"}, including their essays,
		evaluations, and chats
	{/if}. This action cannot be undone.
</p>

{#if sessions.length > 0}
	<div class="mt-3 flex flex-col gap-1.5" aria-label="Dependent practice sessions">
		<p class="text-xs font-semibold text-base-content/75">Affected practice sessions:</p>
		<div class="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
			{#each sessions as session (session.id)}
				<a
					class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-box border border-base-content/10 px-2.5 py-1.5 text-xs hover:bg-primary hover:text-primary-content"
					href={practiceHref(session.id)}
					target="_blank"
					rel="noopener noreferrer"
					title="Open in a new tab">
					<span class="badge rounded-box badge-soft badge-xs">
						{session.type === "timed" ? "Timed" : "Free"}
					</span>
					<span class="truncate font-semibold">{session.name}</span>
					<span class="text-right whitespace-nowrap">
						{#if session.estimatedBand}
							Band {session.estimatedBand.toFixed(1)}
						{:else}
							{formatRelativeTime(session.updatedAt)}
						{/if}
					</span>
				</a>
			{/each}
		</div>
	</div>

	<div class="mt-3 flex flex-col gap-1.5">
		<label class="flex flex-col gap-1.5">
			<span class="flex items-center gap-1.5 text-xs font-semibold text-base-content/75">
				<TriangleAlert class="size-4 text-warning" />
				Type “{CONFIRM_PHRASE}” to confirm
			</span>
			<input
				class="input w-full"
				type="text"
				placeholder={CONFIRM_PHRASE}
				autocomplete="off"
				spellcheck="false"
				aria-label="Type '{CONFIRM_PHRASE}' to confirm deletion"
				bind:value={confirmPhrase} />
		</label>
	</div>
{:else}
	<p class="mt-2 text-xs text-base-content/75">
		This task is not used by any practice sessions yet, so nothing else will be removed.
	</p>
{/if}

<div class="modal-action">
	<button type="button" class="btn" onclick={closeModal}>Cancel</button>
	<button
		type="button"
		class="btn btn-error"
		disabled={sessions.length > 0 && confirmPhrase.trim() !== CONFIRM_PHRASE}
		onclick={handleDelete}>
		Delete task
	</button>
</div>
