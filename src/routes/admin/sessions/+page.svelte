<script lang="ts">
	import { onMount } from "svelte";
	import { getAdminSessionDetail, getAdminSessions } from "#lib/remotes/query/admin-data.remote.ts";
	import { deleteAdminSession } from "#lib/remotes/command/admin.remote.ts";

	type Result = Awaited<ReturnType<typeof getAdminSessions>>;
	type Detail = Awaited<ReturnType<typeof getAdminSessionDetail>>;
	let data = $state<Result | null>(null);
	let detail = $state<Detail | null>(null);
	let search = $state("");
	let category = $state<"all" | "1" | "2">("all");
	let type = $state<"all" | "free" | "timed">("all");
	let evaluation = $state<"all" | "evaluated" | "unevaluated">("all");
	let days = $state<"all" | "7" | "30" | "90">("all");
	let page = $state(1);
	let loading = $state(true);
	let busy = $state(false);
	let message = $state("");
	let loadError = $state("");
	const pageSize = 20;

	async function load() {
		loading = true;
		loadError = "";
		try {
			const query = getAdminSessions({ page, pageSize, search, category, type, evaluation, days });
			await query.refresh();
			data = await query;
		}
		catch (cause) { loadError = cause instanceof Error ? cause.message : "Could not load practice sessions."; }
		finally { loading = false; }
	}
	onMount(() => void load());
	function filterChanged() { page = 1; void load(); }
	async function openDetail(id: string) {
		busy = true; loadError = "";
		try {
			const query = getAdminSessionDetail(id);
			await query.refresh();
			detail = await query;
		}
		catch (cause) { loadError = cause instanceof Error ? cause.message : "Could not load session detail."; }
		finally { busy = false; }
	}
	async function removeSession() {
		if (!detail || !window.confirm(`Permanently delete “${detail.name}” and its writing, evaluation, and chat messages?`)) return;
		busy = true; loadError = ""; message = "";
		try { await deleteAdminSession({ practiceSessionId: detail.id }); message = "Practice session and dependent records deleted."; detail = null; await load(); }
		catch (cause) { loadError = cause instanceof Error ? cause.message : "Could not delete practice session."; }
		finally { busy = false; }
	}
	const countWords = (value: string) => value.trim() ? value.trim().split(/\s+/u).length : 0;
</script>

<svelte:head><title>Practice Sessions · Admin</title></svelte:head>
<div>
	<p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">User activity</p>
	<h1 class="mt-1 text-3xl font-bold tracking-tight">Practice Sessions</h1>
	<p class="mt-1 text-sm text-base-content/70">Review session owners, writing, evaluations, and tutor messages.</p>
</div>
{#if message}<div class="alert alert-success mt-4" role="status">{message}</div>{/if}
{#if loadError}<div class="alert alert-error mt-4" role="alert">{loadError}<button class="btn btn-sm" onclick={() => void load()}>Retry</button></div>{/if}

<section class="admin-panel p-4 sm:p-5" aria-label="Session filters">
	<div class="mb-4"><h2 class="font-semibold">Find sessions</h2><p class="text-sm text-base-content/65">Filter by owner, task type, evaluation, or recent activity.</p></div>
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
		<label class="admin-field sm:col-span-2 xl:col-span-1"><span class="admin-field-label">Search</span><input class="input input-bordered w-full" type="search" placeholder="Title, user, or prompt" bind:value={search} oninput={filterChanged} /></label>
		<label class="admin-field"><span class="admin-field-label">Task</span><select class="select select-bordered w-full" bind:value={category} onchange={filterChanged}><option value="all">All tasks</option><option value="1">Task 1</option><option value="2">Task 2</option></select></label>
		<label class="admin-field"><span class="admin-field-label">Practice mode</span><select class="select select-bordered w-full" bind:value={type} onchange={filterChanged}><option value="all">All modes</option><option value="free">Free</option><option value="timed">Timed</option></select></label>
		<label class="admin-field"><span class="admin-field-label">Evaluation</span><select class="select select-bordered w-full" bind:value={evaluation} onchange={filterChanged}><option value="all">All evaluation states</option><option value="evaluated">Evaluated</option><option value="unevaluated">Not evaluated</option></select></label>
		<label class="admin-field"><span class="admin-field-label">Date range</span><select class="select select-bordered w-full" bind:value={days} onchange={filterChanged}><option value="all">Any time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
	</div>
</section>

{#if loading}<div class="alert mt-4" role="status"><span class="loading loading-spinner loading-sm"></span>Loading sessions…</div>
{:else if data?.sessions.length}
	<div class="admin-panel overflow-x-auto">
		<table class="table table-zebra min-w-[900px]">
			<thead><tr><th>Session</th><th>Owner</th><th>Task / mode</th><th>Evaluation</th><th>Started</th><th></th></tr></thead>
			<tbody>{#each data.sessions as session (session.id)}
				<tr>
					<td><p class="max-w-64 truncate font-medium">{session.name}</p><p class="max-w-64 truncate text-xs text-base-content/60">{session.prompt}</p></td>
					<td><p>{session.ownerName}</p><p class="text-xs text-base-content/60">{session.ownerEmail}</p></td>
					<td><span class="badge badge-primary">Task {session.category}</span><span class="ml-1 badge">{session.type}</span></td>
					<td>{session.evaluated ? `Band ${session.band ?? "—"}` : "Not evaluated"}</td>
					<td class="whitespace-nowrap text-xs">{session.startedAt.toLocaleString()}</td>
					<td><button class="btn btn-outline btn-xs" disabled={busy} onclick={() => void openDetail(session.id)}>View</button></td>
				</tr>
			{/each}</tbody>
		</table>
	</div>
	<div class="mt-3 flex items-center justify-between text-sm"><span>{data.total} sessions · page {data.page}</span><div class="join"><button class="btn join-item btn-sm" disabled={page <= 1} onclick={() => { page -= 1; void load(); }}>Previous</button><button class="btn join-item btn-sm" disabled={page * pageSize >= data.total} onclick={() => { page += 1; void load(); }}>Next</button></div></div>
{:else if !loading && !loadError}<div class="admin-panel p-8 text-center text-base-content/70">No practice sessions match these filters.</div>{/if}

{#if detail}
	<section class="admin-panel border-primary/20" aria-label="Practice session detail">
		<div class="card-body gap-4 p-4 sm:p-6">
			<div class="flex flex-col gap-4 border-b border-base-content/10 pb-4 sm:flex-row sm:items-start sm:justify-between"><div class="min-w-0"><h2 class="text-xl font-bold">{detail.name}</h2><p class="mt-1 text-sm text-base-content/75">Owner: {detail.ownerName} · {detail.ownerEmail}</p><p class="mt-1 text-xs text-base-content/60">Task {detail.category} · {detail.subcategory ?? "Uncategorized"} · {detail.type} · started {detail.startedAt.toLocaleString()}</p></div><div class="flex shrink-0 gap-2"><button class="btn btn-ghost btn-sm" onclick={() => (detail = null)}>Close detail</button><button class="btn btn-error btn-sm" disabled={busy} onclick={removeSession}>Delete session</button></div></div>
			{#if detail.image}<img src={`/tasks/${detail.taskId}/image`} alt="Task visual" class="max-h-64 w-full rounded-box bg-base-200 object-contain" />{/if}
			<section class="rounded-2xl bg-base-200/50 p-4"><h3 class="mb-2 font-semibold">Question prompt</h3><p class="whitespace-pre-wrap text-sm leading-6">{detail.prompt}</p></section>
			<section class="rounded-2xl bg-base-200/50 p-4"><h3 class="mb-2 font-semibold">Writing · {countWords(detail.response)} words</h3><p class="max-h-96 overflow-auto whitespace-pre-wrap text-sm leading-6">{detail.response || "No response saved."}</p></section>
			<section class="rounded-2xl bg-base-200/50 p-4"><h3 class="mb-2 font-semibold">Evaluation</h3><pre class="max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-5">{detail.evaluation ? JSON.stringify(detail.evaluation, null, 2) : "No evaluation saved."}</pre></section>
			<section class="rounded-2xl bg-base-200/50 p-4"><h3 class="mb-2 font-semibold">AI Tutor conversation · {detail.messages.length} messages</h3>{#if detail.messages.length}<div class="flex max-h-80 flex-col gap-3 overflow-auto">{#each detail.messages as message (message.id)}<article class="rounded-xl bg-base-100 p-3 text-sm"><p class="mb-2 text-xs font-semibold text-base-content/60">{message.from} · {message.createdAt.toLocaleString()}</p><p class="whitespace-pre-wrap leading-6">{message.message}</p></article>{/each}</div>{:else}<p class="text-sm text-base-content/60">No tutor messages saved.</p>{/if}</section>
		</div>
	</section>
{/if}
