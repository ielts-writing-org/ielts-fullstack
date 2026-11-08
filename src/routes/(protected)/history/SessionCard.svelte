<script lang="ts">
	import {
		ArrowRight,
		CalendarDays,
		Check,
		Clock3,
		Copy,
		Download,
		EllipsisVertical,
		FileText,
		PenLine,
		Trash,
		TriangleAlert
	} from "@lucide/svelte";
	import { openModal } from "#lib/components/Modal.svelte";
	import { getTimeLimitInMinutes } from "#lib/utils/ielts.js";
	import { getResponseIdealWordCount } from "#lib/domain/task-response.ts";
	import { getTaskSubcategoryLabel } from "#lib/domain/task-subcategory.ts";
	import { CRITERIA_LABELS } from "#lib/domain/criteria.js";
	import { formatRelativeTime } from "#lib/utils/time.js";
	import { practiceHref, type SessionItem } from "./utils.ts";

	type Props = {
		session: SessionItem;
		bandTarget: number | null;
		onRename: (session: SessionItem) => void;
		onDelete: (session: SessionItem) => void;
	};
	let { session, bandTarget, onRename, onDelete }: Props = $props();

	let copiedSessionId = $state<string | null>(null);

	const rings = $derived(
		(Object.keys(CRITERIA_LABELS) as (keyof typeof CRITERIA_LABELS)[]).flatMap((key) => {
			const band = session.criteria?.[key];
			return band === undefined ? [] : [{ key, label: CRITERIA_LABELS[key], band }];
		})
	);

	/** Turns a session name into a safe download filename. */
	function sanitizeFilename(name: string): string {
		const cleaned = name
			.replace(/[^\w\s-]/g, "")
			.trim()
			.replace(/\s+/g, "-");
		return cleaned || "practice-session";
	}

	async function handleCopyEssay() {
		try {
			await navigator.clipboard.writeText(`${session.taskPrompt}\n\n\n${session.response}`);
			copiedSessionId = session.id;
			setTimeout(() => {
				if (copiedSessionId === session.id) {
					copiedSessionId = null;
				}
			}, 1500);
		} catch {
			openModal({
				title: "Copy failed",
				content: "Your browser blocked clipboard access. Use Download .txt instead.",
				primaryButton: "Close"
			});
		}
	}

	function handleDownloadEssay() {
		const blob = new Blob([session.taskPrompt, "\n\n\n", session.response], {
			type: "text/plain;charset=utf-8"
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `${sanitizeFilename(session.name)}.txt`;
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<article
	class={[
		"flex flex-col gap-3 rounded-box border border-base-content/20 bg-base-100 p-3",
		"sm:flex-row lg:items-center",
		"hover:shadow"
	]}>
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="badge rounded-box badge-soft badge-xs font-semibold badge-primary">
			Task {session.taskCategory}
		</span>

		<h3 class="mt-1.5 truncate font-semibold">{session.name}</h3>
		<p class={["mt-0.5 line-clamp-3 flex-1 text-xs text-base-content/75", "sm:line-clamp-2"]}>
			{session.taskPrompt}
		</p>

		<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/75">
			{#if session.taskSubcategory}
				<span class="badge badge-soft badge-xs">
					{getTaskSubcategoryLabel(session.taskSubcategory)}
				</span>
			{/if}
			<span class="flex items-center gap-1">
				<CalendarDays size="1em" />
				<time datetime={session.updatedAt.toISOString()} title={session.updatedAt.toLocaleString()}>
					{formatRelativeTime(session.updatedAt)}
				</time>
			</span>
			<span class="flex items-center gap-1">
				<Clock3 size="1em" />
				{session.type === "timed"
					? `${getTimeLimitInMinutes(session.taskCategory)} min limit`
					: "Unlimited time"}
			</span>
			<span
				class="tooltip tooltip-top"
				data-tip={session.words >= getResponseIdealWordCount(session.taskCategory)
					? `Meets the ${getResponseIdealWordCount(session.taskCategory)}-word minimum`
					: `Below the ${getResponseIdealWordCount(session.taskCategory)}-word minimum`}>
				<span class="flex items-center gap-1">
					<FileText size="1em" />
					<span
						class={session.words < getResponseIdealWordCount(session.taskCategory)
							? "text-warning"
							: undefined}>
						{session.words} words
					</span>
					{#if session.words >= getResponseIdealWordCount(session.taskCategory)}
						<Check class="size-3 text-success" />
					{:else}
						<TriangleAlert class="size-3 text-warning" />
					{/if}
				</span>
			</span>
		</div>
	</div>

	<div class="flex items-center justify-between gap-3 lg:shrink-0 lg:justify-end">
		{#if session.estimatedBand !== undefined && session.criteria}
			<div class="flex items-center gap-3">
				<div class="flex flex-col items-center">
					<div
						class={[
							"radial-progress font-semibold",
							bandTarget && session.estimatedBand >= bandTarget ? "text-success" : "text-warning"
						]}
						style:--value={(session.estimatedBand / 9) * 100}
						style:--size="3.25em"
						role="progressbar"
						aria-label="Overall band"
						aria-valuenow={session.estimatedBand}
						aria-valuemin={0}
						aria-valuemax={9}>
						{session.estimatedBand.toFixed(1)}
					</div>
					<span class="mt-0.5 text-xs text-base-content/75">Overall</span>
				</div>

				<div class="hidden items-center gap-1.5 sm:flex">
					{#each rings as ring (ring.key)}
						<div class="tooltip tooltip-top" data-tip={`${ring.label}: ${ring.band}`}>
							<div
								class={[
									"radial-progress text-xs",
									bandTarget && ring.band >= bandTarget ? "text-success" : "text-warning"
								]}
								style:--value={(ring.band / 9) * 100}
								style:--size="2.25em"
								role="progressbar"
								aria-label={ring.label}
								aria-valuenow={ring.band}
								aria-valuemin={0}
								aria-valuemax={9}>
								{ring.band}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<span class="badge badge-ghost badge-sm whitespace-nowrap">No evaluation yet</span>
		{/if}

		<div>
			<a class="btn shrink-0 btn-outline btn-primary btn-sm" href={practiceHref(session.id)}>
				{session.estimatedBand ? "Review" : "Continue"}
				<ArrowRight size="1em" />
			</a>

			<div class="dropdown dropdown-end">
				<button
					class="btn btn-circle btn-ghost btn-sm"
					aria-label="Session actions"
					aria-haspopup="menu">
					<EllipsisVertical class="size-4" />
				</button>
				<ul class="menu dropdown-content z-1 w-44 rounded-box bg-base-100 p-1.5 shadow-sm">
					<li>
						<button onclick={handleCopyEssay}>
							{copiedSessionId === session.id ? "Copied!" : "Copy essay"}
							<Copy size="1em" />
						</button>
					</li>
					<li>
						<button onclick={handleDownloadEssay}>
							Download .txt
							<Download size="1em" />
						</button>
					</li>
					<li class="mt-1 border-t border-base-content/10 pt-1">
						<button onclick={() => onRename(session)}>
							Rename
							<PenLine size="1em" />
						</button>
					</li>
					<li>
						<button class="text-error" onclick={() => onDelete(session)}>
							Delete
							<Trash size="1em" />
						</button>
					</li>
				</ul>
			</div>
		</div>
	</div>
</article>
