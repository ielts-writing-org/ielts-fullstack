<script lang="ts">
	import { onMount } from "svelte";
	import { getAdminUsers } from "#lib/remotes/query/admin-data.remote.ts";
	import {
		revokeAdminUserSessions,
		setAdminUserLocked,
		setAdminUserRole
	} from "#lib/remotes/command/admin.remote.ts";

	type Result = Awaited<ReturnType<typeof getAdminUsers>>;
	let data = $state<Result | null>(null);
	let search = $state("");
	let role = $state<"all" | "admin" | "user">("all");
	let status = $state<"all" | "active" | "locked">("all");
	let page = $state(1);
	let loading = $state(true);
	let busy = $state(false);
	let message = $state("");
	let loadError = $state("");
	let timer: ReturnType<typeof setTimeout>;
	const pageSize = 20;

	async function load() {
		loading = true;
		loadError = "";
		try {
			const query = getAdminUsers({ page, pageSize, search, role, status });
			await query.refresh();
			data = await query;
		} catch (cause) {
			loadError = cause instanceof Error ? cause.message : "Could not load users.";
		} finally {
			loading = false;
		}
	}

	onMount(() => void load());
	function filterChanged() {
		page = 1;
		void load();
	}
	function searchChanged(value: string) {
		search = value;
		clearTimeout(timer);
		timer = setTimeout(filterChanged, 250);
	}
	async function mutate(action: () => Promise<unknown>, success: string) {
		busy = true;
		message = "";
		loadError = "";
		try {
			await action();
			message = success;
			await load();
		} catch (cause) {
			loadError = cause instanceof Error ? cause.message : "The action failed.";
		} finally {
			busy = false;
		}
	}
	const date = (value: Date | null) => value ? value.toLocaleString() : "Never recorded";
</script>

<svelte:head><title>Users · Admin</title></svelte:head>
<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
	<div>
		<p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">Access control</p>
		<h1 class="mt-1 text-3xl font-bold tracking-tight">Users</h1>
		<p class="mt-1 text-sm text-base-content/70">Manage Better Auth roles, account locks, and sessions.</p>
	</div>
	<span class="badge badge-outline badge-lg self-start sm:self-auto">{data?.total ?? 0} accounts</span>
</div>

{#if message}<div class="alert alert-success mt-4" role="status">{message}</div>{/if}
{#if loadError}<div class="alert alert-error mt-4" role="alert">{loadError}<button class="btn btn-sm" onclick={() => void load()}>Retry</button></div>{/if}

<section class="admin-panel p-4 sm:p-5" aria-label="User filters">
	<div class="mb-4"><h2 class="font-semibold">Find accounts</h2><p class="text-sm text-base-content/65">Search by name or email, then narrow the list by role or status.</p></div>
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,2fr)_minmax(10rem,1fr)_minmax(10rem,1fr)]">
		<label class="admin-field"><span class="admin-field-label">Search</span><input class="input input-bordered w-full" type="search" value={search} placeholder="Name or email" oninput={(event) => searchChanged(event.currentTarget.value)} /></label>
		<label class="admin-field"><span class="admin-field-label">Role</span><select class="select select-bordered w-full" bind:value={role} onchange={filterChanged}><option value="all">All roles</option><option value="admin">Admins</option><option value="user">Users</option></select></label>
		<label class="admin-field"><span class="admin-field-label">Account status</span><select class="select select-bordered w-full" bind:value={status} onchange={filterChanged}><option value="all">All statuses</option><option value="active">Active</option><option value="locked">Locked</option></select></label>
	</div>
</section>

{#if loading}
	<div class="alert mt-4" role="status"><span class="loading loading-spinner loading-sm"></span>Loading users…</div>
{:else if data?.users.length}
	<div class="admin-panel overflow-x-auto">
		<table class="table table-zebra min-w-[980px]">
			<thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Created</th><th>Last active</th><th>Actions</th></tr></thead>
			<tbody>
				{#each data.users as user (user.id)}
					<tr>
						<td><div class="flex min-w-52 items-center gap-3"><div class="avatar"><div class="w-10 rounded-full ring-1 ring-base-content/10"><img src={user.image ?? "/favicon.png"} alt="" /></div></div><div class="min-w-0"><p class="truncate font-semibold">{user.name}</p><p class="truncate text-xs text-base-content/65">{user.email}</p></div></div></td>
						<td><span class="badge" class:badge-primary={user.role === "admin"}>{user.role === "admin" ? "Admin" : "User"}</span></td>
						<td><span class="badge" class:badge-error={user.locked} class:badge-success={!user.locked}>{user.locked ? "Locked" : "Active"}</span></td>
						<td class="whitespace-nowrap text-xs">{date(user.createdAt)}</td>
						<td class="whitespace-nowrap text-xs">{date(user.lastActiveAt)}</td>
						<td><div class="flex min-w-64 flex-wrap gap-2">
							<button class="btn btn-sm" disabled={busy || user.id === data.currentAdminId} onclick={() => {
								const locked = !user.locked;
								if (window.confirm(`${locked ? "Lock" : "Unlock"} ${user.name}? ${locked ? "Their current sessions will also be revoked." : ""}`)) {
									void mutate(() => setAdminUserLocked({ userId: user.id, locked, reason: "Locked from Admin user management." }), `Account ${locked ? "locked" : "unlocked"}.`);
								}
							}}>{user.locked ? "Unlock" : "Lock"}</button>
							<button class="btn btn-sm btn-outline" disabled={busy || user.id === data.currentAdminId} onclick={() => {
								const isAdmin = user.role !== "admin";
								if (window.confirm(`${isAdmin ? "Grant" : "Revoke"} Admin access ${isAdmin ? "to" : "from"} ${user.name}?`)) {
									void mutate(() => setAdminUserRole({ userId: user.id, isAdmin }), `Admin role ${isAdmin ? "granted" : "revoked"}.`);
								}
							}}>{user.role === "admin" ? "Revoke Admin" : "Grant Admin"}</button>
							<button class="btn btn-sm btn-ghost" disabled={busy || user.id === data.currentAdminId} onclick={() => {
								if (window.confirm(`Revoke every active session for ${user.name}?`)) void mutate(() => revokeAdminUserSessions({ userId: user.id }), "User sessions revoked.");
							}}>Revoke sessions</button>
						</div></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="flex flex-wrap items-center justify-between gap-3 text-sm"><span>Page {data.page} · {data.total} accounts</span><div class="join"><button class="btn join-item btn-sm" disabled={page <= 1 || busy} onclick={() => { page -= 1; void load(); }}>Previous</button><button class="btn join-item btn-sm" disabled={page * pageSize >= data.total || busy} onclick={() => { page += 1; void load(); }}>Next</button></div></div>
{:else if !loading && !loadError}
	<div class="admin-panel p-8 text-center text-base-content/70">No accounts match these filters.</div>
{/if}
