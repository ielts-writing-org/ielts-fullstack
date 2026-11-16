<script lang="ts">
	import { onMount } from "svelte";
	import { getAdminAiRequests, getAdminDashboard } from "#lib/remotes/query/admin-data.remote.ts";

	type Requests = Awaited<ReturnType<typeof getAdminAiRequests>>;
	type Dashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
	let data = $state<Requests | null>(null);
	let summary = $state<Dashboard | null>(null);
	let kind = $state<"all" | "grading" | "chat">("all");
	let status = $state<"all" | "pending" | "success" | "error">("all");
	let model = $state("");
	let days = $state<"7" | "30" | "90" | "365">("30");
	let page = $state(1);
	let loading = $state(true);
	let loadError = $state("");
	const pageSize = 30;

	async function load() {
		loading = true; loadError = "";
		try {
			const requestsQuery = getAdminAiRequests({ page, pageSize, kind, status, model, days });
			const dashboardQuery = getAdminDashboard(days);
			await Promise.all([requestsQuery.refresh(), dashboardQuery.refresh()]);
			[data, summary] = await Promise.all([requestsQuery, dashboardQuery]);
		} catch (cause) { loadError = cause instanceof Error ? cause.message : "Could not load AI telemetry."; }
		finally { loading = false; }
	}
	onMount(() => void load());
	function filterChanged() { page = 1; void load(); }
	const time = (value: Date) => value.toLocaleString();
	const number = (value: number | null) => value === null ? "—" : value.toLocaleString();
</script>

<svelte:head><title>AI Monitoring · Admin</title></svelte:head>
<div>
	<p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Operations</p>
	<h1 class="mt-1 text-3xl font-bold tracking-tight">AI Monitoring</h1>
	<p class="mt-1 text-sm text-base-content/70">Recorded grading and Tutor requests. Prompt text and provider secrets are not stored.</p>
</div>

{#if summary}
	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="AI telemetry summary">
		<div class="admin-panel p-4"><p class="text-xs font-semibold text-base-content/65">Requests · {days} days</p><p class="mt-2 text-2xl font-bold">{summary.requests.total.toLocaleString()}</p></div>
		<div class="admin-panel p-4"><p class="text-xs font-semibold text-base-content/65">Error rate</p><p class="mt-2 text-2xl font-bold">{(summary.requests.errorRate * 100).toFixed(1)}%</p><p class="mt-1 text-xs text-base-content/60">Completed requests only</p></div>
		<div class="admin-panel p-4"><p class="text-xs font-semibold text-base-content/65">Average stream duration</p><p class="mt-2 text-2xl font-bold">{summary.requests.averageLatencyMs === null ? "—" : `${Math.round(summary.requests.averageLatencyMs)} ms`}</p></div>
		<div class="admin-panel p-4"><p class="text-xs font-semibold text-base-content/65">Input tokens reported</p><p class="mt-2 text-2xl font-bold">{summary.requests.inputTokens.toLocaleString()}</p></div>
		<div class="admin-panel p-4"><p class="text-xs font-semibold text-base-content/65">Output tokens reported</p><p class="mt-2 text-2xl font-bold">{summary.requests.outputTokens.toLocaleString()}</p></div>
	</section>
{/if}

{#if loadError}<div class="alert alert-error mt-4" role="alert">{loadError}<button class="btn btn-sm" onclick={() => void load()}>Retry</button></div>{/if}
<section class="admin-panel p-4 sm:p-5" aria-label="Telemetry filters">
	<div class="mb-4"><h2 class="font-semibold">Filter requests</h2><p class="text-sm text-base-content/65">Choose a request type, status, or model to inspect telemetry.</p></div>
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
		<label class="admin-field"><span class="admin-field-label">Request type</span><select class="select select-bordered w-full" bind:value={kind} onchange={filterChanged}><option value="all">All request types</option><option value="grading">Grading</option><option value="chat">AI Tutor</option></select></label>
		<label class="admin-field"><span class="admin-field-label">Status</span><select class="select select-bordered w-full" bind:value={status} onchange={filterChanged}><option value="all">All statuses</option><option value="pending">Pending</option><option value="success">Success</option><option value="error">Error</option></select></label>
		<label class="admin-field"><span class="admin-field-label">Model ID</span><input class="input input-bordered w-full" bind:value={model} placeholder="Exact model id" onkeydown={(event) => event.key === "Enter" && filterChanged()} /></label>
		<label class="admin-field"><span class="admin-field-label">Date range</span><select class="select select-bordered w-full" bind:value={days} onchange={filterChanged}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 365 days</option></select></label>
		<button class="btn btn-outline" onclick={filterChanged}>Apply filters</button>
	</div>
</section>

{#if loading}<div class="alert mt-4" role="status"><span class="loading loading-spinner loading-sm"></span>Loading request history…</div>
{:else if data?.requests.length}
	<div class="admin-panel overflow-x-auto">
		<table class="table table-zebra min-w-[1100px]">
			<thead><tr><th>Request</th><th>Status</th><th>Model</th><th>Time / latency</th><th>Tokens</th><th>Session</th><th>Sanitized error</th></tr></thead>
			<tbody>{#each data.requests as request (request.id)}
				<tr>
					<td><span class="badge" class:badge-primary={request.kind === "grading"}>{request.kind}</span><div class="mt-1 text-xs">{request.userName ?? "Deleted account"}</div>{#if request.userEmail}<div class="text-xs text-base-content/60">{request.userEmail}</div>{/if}</td>
					<td><span class="badge" class:badge-success={request.status === "success"} class:badge-error={request.status === "error"}>{request.status}</span></td>
					<td class="max-w-56 break-all text-xs">{request.model}</td>
					<td class="whitespace-nowrap text-xs">{time(request.startedAt)}<div>{request.durationMs === null ? "—" : `${number(request.durationMs)} ms`}</div></td>
					<td class="whitespace-nowrap text-xs">In: {number(request.inputTokens)}<br />Out: {number(request.outputTokens)}</td>
					<td class="max-w-36 break-all text-xs">{request.practiceSessionId ?? "—"}</td>
					<td class="max-w-72 whitespace-normal text-xs text-error">{request.errorSummary ?? "—"}</td>
				</tr>
			{/each}</tbody>
		</table>
	</div>
	<div class="mt-3 flex items-center justify-between text-sm"><span>{data.total} requests · page {data.page}</span><div class="join"><button class="btn join-item btn-sm" disabled={page <= 1} onclick={() => { page -= 1; void load(); }}>Previous</button><button class="btn join-item btn-sm" disabled={page * pageSize >= data.total} onclick={() => { page += 1; void load(); }}>Next</button></div></div>
{:else if !loading && !loadError}<div class="admin-panel p-8 text-center text-base-content/70">No AI telemetry matches this period. Historical requests are not reconstructed.</div>{/if}
