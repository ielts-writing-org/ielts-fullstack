<script lang="ts">
	import { onMount } from "svelte";
	import { getAdminAuditLogs, getAdminReport } from "#lib/remotes/query/admin-data.remote.ts";

	type Report = Awaited<ReturnType<typeof getAdminReport>>;
	type Audit = Awaited<ReturnType<typeof getAdminAuditLogs>>;
	const toDate = new Date().toISOString().slice(0, 10);
	const fromDate = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
	let from = $state(fromDate);
	let to = $state(toDate);
	let data = $state<Report | null>(null);
	let audits = $state<Audit | null>(null);
	let loading = $state(true);
	let loadError = $state("");
	let exporting = $state(false);

	async function load() {
		loading = true; loadError = "";
		try {
			const reportQuery = getAdminReport({ from, to });
			const auditQuery = getAdminAuditLogs();
			await Promise.all([reportQuery.refresh(), auditQuery.refresh()]);
			[data, audits] = await Promise.all([reportQuery, auditQuery]);
		}
		catch (cause) { loadError = cause instanceof Error ? cause.message : "Could not load report data."; }
		finally { loading = false; }
	}
	onMount(() => void load());
	function csvCell(value: unknown) {
		let text = String(value ?? "");
		const firstNonWhitespace = text.trimStart().charAt(0);
		if (firstNonWhitespace && "=+-@".includes(firstNonWhitespace)) text = `'${text}`;
		return `"${text.replaceAll('"', '""')}"`;
	}
	function exportCsv() {
		if (!data) return;
		exporting = true;
		try {
			const headers = ["Day", "Practice sessions", "Evaluations", "Grading requests", "Tutor chat requests", "AI errors", "Input tokens reported", "Output tokens reported"];
			const rows = data.map((row) => [row.day, row.sessions, row.evaluations, row.grading, row.chat, row.aiErrors, row.inputTokens, row.outputTokens]);
			const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
			const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = `ielts-admin-report-${from}-to-${to}.csv`;
			anchor.click();
			URL.revokeObjectURL(url);
		} finally { exporting = false; }
	}
</script>

<svelte:head><title>Reports · Admin</title></svelte:head>
<div>
	<p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Analytics</p>
	<h1 class="mt-1 text-3xl font-bold tracking-tight">Reports</h1>
	<p class="mt-1 text-sm text-base-content/70">Aggregate daily activity and administrative audit history.</p>
</div>
{#if loadError}<div class="alert alert-error mt-4" role="alert">{loadError}<button class="btn btn-sm" onclick={() => void load()}>Retry</button></div>{/if}
<section class="admin-panel p-4 sm:p-5" aria-label="Report date range">
	<div class="mb-4"><h2 class="font-semibold">Report period</h2><p class="text-sm text-base-content/65">Choose a date range of up to 366 days. All dates are shown in UTC.</p></div>
	<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="admin-field"><span class="admin-field-label">From</span><input class="input input-bordered w-full" type="date" bind:value={from} /></label>
			<label class="admin-field"><span class="admin-field-label">To</span><input class="input input-bordered w-full" type="date" bind:value={to} /></label>
		</div>
		<div class="flex flex-wrap gap-2"><button class="btn btn-primary" disabled={loading || !from || !to} onclick={() => void load()}>Load report</button><button class="btn btn-outline" disabled={!data || exporting} onclick={exportCsv}>{exporting ? "Preparing…" : "Export CSV"}</button></div>
	</div>
</section>

{#if loading}<div class="alert mt-4" role="status"><span class="loading loading-spinner loading-sm"></span>Loading report…</div>
{:else if data}
	<div class="admin-panel overflow-x-auto">
		<table class="table table-zebra min-w-[820px]"><thead><tr><th>Day (UTC)</th><th>Sessions</th><th>Evaluations</th><th>Grading</th><th>Tutor chat</th><th>AI errors</th><th>Input tokens</th><th>Output tokens</th></tr></thead>
			<tbody>{#each data as row (row.day)}<tr><td>{row.day}</td><td>{row.sessions.toLocaleString()}</td><td>{row.evaluations.toLocaleString()}</td><td>{row.grading.toLocaleString()}</td><td>{row.chat.toLocaleString()}</td><td>{row.aiErrors.toLocaleString()}</td><td>{row.inputTokens.toLocaleString()}</td><td>{row.outputTokens.toLocaleString()}</td></tr>{/each}</tbody>
		</table>
	</div>
{/if}

	<section class="mt-7 space-y-4">
	<div><p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Security</p><h2 class="mt-1 text-2xl font-bold">Admin audit log</h2><p class="mt-1 text-sm text-base-content/70">Latest 100 sensitive actions; metadata omits prompts, secrets, and request content.</p></div>
	{#if audits?.length}
		<div class="admin-panel overflow-x-auto"><table class="table table-zebra min-w-[850px]"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Safe metadata</th></tr></thead><tbody>
			{#each audits as entry (entry.id)}<tr><td class="whitespace-nowrap">{entry.createdAt.toLocaleString()}</td><td>{entry.actor ?? "Unknown admin"}</td><td class="font-mono text-xs">{entry.action}</td><td>{entry.targetType}{entry.targetId ? ` · ${entry.targetId}` : ""}</td><td class="max-w-80 break-all text-xs">{JSON.stringify(entry.metadata)}</td></tr>{/each}
		</tbody></table></div>
	{:else if !loading && audits}<div class="admin-panel p-8 text-center text-sm text-base-content/65">No Admin actions recorded yet.</div>{/if}
</section>
