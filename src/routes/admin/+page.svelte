<script lang="ts">
	import { onMount } from "svelte";
	import { getAdminDashboard } from "#lib/remotes/query/admin-data.remote.ts";

	type Dashboard = Awaited<ReturnType<typeof getAdminDashboard>>;
	let data = $state<Dashboard | null>(null);
	let days = $state<"7" | "30" | "90" | "365">("30");
	let loading = $state(true);
	let loadError = $state("");

	async function load() {
		loading = true;
		loadError = "";
		try {
			const query = getAdminDashboard(days);
			await query.refresh();
			data = await query;
		} catch (cause) {
			loadError = cause instanceof Error ? cause.message : "Could not load dashboard data.";
		} finally {
			loading = false;
		}
	}

	onMount(() => void load());
	const number = (value: number) => value.toLocaleString();
	const chartWidth = (value: number, values: number[]) => {
		const max = Math.max(1, ...values);
		return `${Math.max(3, (value / max) * 100)}%`;
	};
</script>

<svelte:head><title>Admin Dashboard · IELTS Writing</title></svelte:head>

<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
	<div>
		<p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Overview</p>
		<h1 class="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
		<p class="mt-1 text-sm text-base-content/70">Live totals from D1 and recorded AI telemetry.</p>
	</div>
	<label class="admin-field w-full sm:max-w-52">
		<span class="admin-field-label">Reporting window</span>
		<select class="select select-bordered select-sm" bind:value={days} onchange={() => void load()}>
			<option value="7">Last 7 days</option>
			<option value="30">Last 30 days</option>
			<option value="90">Last 90 days</option>
			<option value="365">Last 365 days</option>
		</select>
	</label>
</div>

{#if loading}
	<div class="alert mt-5" role="status"><span class="loading loading-spinner loading-sm"></span>Loading dashboard…</div>
{:else if loadError}
	<div class="alert alert-error mt-5" role="alert">{loadError}<button class="btn btn-sm" onclick={() => void load()}>Retry</button></div>
{:else if data}
	<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Overview metrics">
		{@render metric("Total users", number(data.totalUsers))}
		{@render metric(`Active users · ${days} days`, number(data.activeUsers), "Users with a practice session updated in the selected period")}
		{@render metric(`Practice sessions · ${days} days`, number(data.sessions))}
		{@render metric(`Evaluated writings · ${days} days`, number(data.evaluatedWritings))}
		{@render metric("Grading requests", number(data.requests.grading))}
		{@render metric("AI Tutor requests", number(data.requests.chat))}
		{@render metric("AI success rate", `${(data.requests.successRate * 100).toFixed(1)}%`, `${number(data.requests.success)} successful · ${number(data.requests.error)} failed; pending excluded`)}
		{@render metric("Average AI stream duration", data.requests.averageLatencyMs === null ? "—" : `${Math.round(data.requests.averageLatencyMs)} ms`)}
		{@render metric("Recorded input tokens", number(data.requests.inputTokens), "Only provider-reported usage")}
		{@render metric("Recorded output tokens", number(data.requests.outputTokens), "Only provider-reported usage")}
	</section>

	<div class="grid gap-4 xl:grid-cols-2">
		<section class="admin-panel">
			<div class="card-body p-4 sm:p-5">
				<h2 class="card-title text-base">Practice sessions by day</h2>
				{#if data.sessionTrend.length}
					<div class="flex max-h-72 flex-col gap-2 overflow-auto" aria-label="Daily practice session counts">
						{#each data.sessionTrend as row (row.day)}
							<div class="grid grid-cols-[5.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-xs">
								<time>{row.day}</time>
								<div class="h-3 rounded bg-base-200"><div class="h-3 rounded bg-primary" style={`width:${chartWidth(row.total, data.sessionTrend.map((item) => item.total))}`}></div></div>
								<span class="text-right">{row.total}</span>
							</div>
						{/each}
					</div>
				{:else}<p class="text-sm text-base-content/60">No sessions recorded in this period.</p>{/if}
			</div>
		</section>
		<section class="admin-panel">
			<div class="card-body p-4 sm:p-5">
				<h2 class="card-title text-base">Evaluations by day</h2>
				{#if data.evaluationTrend.length}
					<div class="flex max-h-72 flex-col gap-2 overflow-auto" aria-label="Daily evaluation counts">
						{#each data.evaluationTrend as row (row.day)}
							<div class="grid grid-cols-[5.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-xs">
								<time>{row.day}</time>
								<div class="h-3 rounded bg-base-200"><div class="h-3 rounded bg-secondary" style={`width:${chartWidth(row.total, data.evaluationTrend.map((item) => item.total))}`}></div></div>
								<span class="text-right">{row.total}</span>
							</div>
						{/each}
					</div>
				{:else}<p class="text-sm text-base-content/60">No evaluations recorded in this period.</p>{/if}
			</div>
		</section>
		<section class="admin-panel">
			<div class="card-body p-4 sm:p-5">
				<h2 class="card-title text-base">Estimated IELTS band distribution</h2>
				{#if data.bandDistribution.length}
					<div class="flex flex-wrap gap-2">
						{#each data.bandDistribution as row (row.band)}
							<div class="stat min-w-24 rounded-box bg-base-200/60 p-3">
								<div class="stat-title">Band {row.band}</div><div class="stat-value text-2xl">{number(row.total)}</div>
							</div>
						{/each}
					</div>
				{:else}<p class="text-sm text-base-content/60">No band results recorded in this period.</p>{/if}
			</div>
		</section>
		<section class="admin-panel">
			<div class="card-body p-4 sm:p-5">
				<h2 class="card-title text-base">AI requests and token usage</h2>
				{#if data.aiTrend.length}
					<div class="flex max-h-72 flex-col gap-2 overflow-auto">
						{#each data.aiTrend as row (row.day)}
							<div class="rounded-box bg-base-200/50 p-2 text-xs">
								<div class="flex justify-between gap-3"><time>{row.day}</time><span>{row.requests} requests · {row.errors} errors</span></div>
								<p class="mt-1 text-base-content/65">Input {number(row.inputTokens)} · output {number(row.outputTokens)} tokens (recorded)</p>
							</div>
						{/each}
					</div>
				{:else}<p class="text-sm text-base-content/60">AI telemetry begins when requests are recorded; there is no historical backfill.</p>{/if}
			</div>
		</section>
	</div>
{/if}

{#snippet metric(label: string, value: string, hint?: string)}
	<div class="admin-panel p-4 sm:p-5">
		<p class="text-xs font-semibold text-base-content/65">{label}</p>
		<p class="mt-1 text-2xl font-bold">{value}</p>
		{#if hint}<p class="mt-1 text-xs text-base-content/60">{hint}</p>{/if}
	</div>
{/snippet}
