<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { LogOut, Palette, PenLine, Undo2 } from "@lucide/svelte";
	import { authClient } from "#lib/auth/auth-client.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import ThemeController from "#lib/components/ThemeController.svelte";
	import { saveTarget } from "./save-target.remote";
	import { goto, invalidate } from "$app/navigation";

	type Props = {
		user: {
			image?: null | string;
			name: string;
		};
		profile: {
			target: number;
		};
	};

	let { user, profile }: Props = $props();

	let target = $derived(profile.target);
	const showPracticeFunctions = $derived(
		page.route.id === "/(protected)/practice/[practiceSessionId=practiceSessionId]"
	);

	async function handleSignOut() {
		openModal({
			title: {
				text: "Sign out confirmation",
				color: "error"
			},
			content: "You are about to sign out!",
			primaryButton: {
				text: "Sign out",
				color: "error",
				style: "ghost",
				onclick: async () => {
					const result = await authClient.signOut();
					if (result.data && result.data.success) {
						await cookieStore.delete("theme");
						/* KNOWN ISSUE: Using SvelteKit refreshAll() does not rerun transformPageChunk() in server hook
						so this will casuse any functionality based on transformPageChunk() broken */
						window.location.reload();
					}

					if (result.error) {
						openModal({
							title: "Sign out error",
							content: `Cannot sign out: ${result.error.message}`,
							primaryButton: "Close"
						});
					}
				}
			},
			secondaryButton: {
				text: "Cancel",
				color: "primary",
				style: "default"
			}
		});
	}

	function handleChangeTarget() {
		openModal({
			title: "Change target band",
			content: { snippet: targetInputSnippet },
			primaryButton: {
				color: "primary",
				text: "Save",
				onclick: async () => {
					await saveTarget({ target: target });
					await invalidate("data:profile");
				}
			},
			secondaryButton: {
				color: "error",
				style: "ghost",
				text: "Cancel",
				onclick: () => (target = profile.target)
			}
		});
	}

	function handleBackToDashboard() {
		openModal({
			title: {
				text: "Back to dashboard confirmation",
				color: "error"
			},
			content: "You are about to return to dashboard.",
			primaryButton: {
				text: "Back to dashboard",
				color: "error",
				style: "ghost",
				onclick: () => goto(resolve("/(protected)"))
			},
			secondaryButton: {
				text: "Cancel",
				color: "primary"
			}
		});
	}

	function handleChangeTheme() {
		openModal({
			title: "Change theme",
			content: { snippet: themeSnippet },
			primaryButton: "Close"
		});
	}
</script>

<!-- <a
	class="badge hidden badge-outline badge-sm font-semibold badge-warning sm:inline-flex"
	href={resolve("/(public)")}>
	🔥 5-Day Streak
</a> -->

<div class="flex flex-col items-end gap-1 overflow-hidden">
	<div dir="rtl" class="w-full overflow-hidden text-left font-semibold text-nowrap text-ellipsis">
		{user.name}
	</div>

	<button
		class="badge cursor-pointer badge-soft badge-xs font-semibold hover:bg-primary hover:text-primary-content"
		onclick={handleChangeTarget}
		title="Change target">
		Target: Band {target}
	</button>
</div>

<div class="avatar shrink-0">
	<button
		class="cursor-pointer"
		style="anchor-name: --avatar"
		popovertarget="avatar-popover"
		title="Open Menu">
		<img class="w-10 rounded-full ring ring-base-content/20" src={user.image} alt={user.name} />
	</button>

	<ul
		class="menu dropdown rounded-box bg-base-100 text-nowrap shadow-sm"
		style="position-anchor: --avatar"
		id="avatar-popover"
		popover="auto">
		{#if showPracticeFunctions}
			<li>
				<button
					class="justify-end active:bg-primary active:text-primary-content"
					onclick={handleBackToDashboard}>
					Back to Dashboard
					<Undo2 size="1em" />
				</button>
			</li>

			<li>
				<button
					class="justify-end active:bg-primary active:text-primary-content"
					onclick={() => {
						openModal({
							title: "Feature is not implemented",
							primaryButton: "Close"
						});
					}}>
					Change practice name
					<PenLine size="1em" />
				</button>
			</li>
		{/if}

		<li>
			<button
				class="justify-end active:bg-primary active:text-primary-content"
				onclick={handleChangeTheme}>
				Change theme
				<Palette size="1em" />
			</button>
		</li>

		<div class="divider mt-2 mb-0 divider-error"></div>

		<li>
			<button
				class="w-full justify-end text-error hover:bg-error hover:text-error-content active:bg-error active:text-error-content"
				onclick={handleSignOut}>
				Sign Out
				<LogOut size="1em" />
			</button>
		</li>
	</ul>
</div>

{#snippet targetInputSnippet()}
	<p class="mb-4">Set your target band:</p>
	<div class="w-full">
		<input
			class="range w-full range-primary range-sm"
			type="range"
			min="0"
			max="9"
			step="0.5"
			bind:value={target} />
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
{/snippet}

{#snippet themeSnippet()}
	<p class="mb-4">Select an available theme below:</p>
	<ThemeController />
{/snippet}
