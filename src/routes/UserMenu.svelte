<script lang="ts">
	import { resolve } from "$app/paths";
	import { refreshAll } from "$app/navigation";
	import { LogOut, Palette, Shield } from "@lucide/svelte";
	import { authClient } from "#lib/auth/auth-client.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import { resetTheme } from "#lib/components/ThemeController.svelte";
	import { getProfile } from "#lib/remotes/profile.remote.ts";
	import InitialsAvatar from "#lib/components/InitialsAvatar.svelte";
	import ChangeBandTarget from "./ChangeBandTarget.svelte";
	import ChangeTheme from "./ChangeTheme.svelte";
	import type { LayoutProps } from "./$types";

	type Props = { user: NonNullable<LayoutProps["data"]["user"]> };
	let { user }: Props = $props();

	let menu = $state<HTMLUListElement>();

	const profileQuery = getProfile();

	async function openSignOutModal() {
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
					if (result.error) {
						return openModal({
							title: "Sign out error",
							content: `Cannot sign out: ${result.error.message}`,
							primaryButton: "Close"
						});
					}

					await resetTheme();
					await refreshAll();
				}
			},
			secondaryButton: {
				text: "Cancel",
				color: "primary",
				style: "default"
			},
			bypassBusy: true
		});
	}

	function openTargetModal() {
		openModal({
			title: "Change target band",
			content: {
				component: ChangeBandTarget,
				props: { bandTarget: profileQuery.current?.bandTarget ?? 0 }
			}
		});
	}

	function openThemeModal() {
		openModal({
			title: "Change theme",
			content: { component: ChangeTheme, props: {} }
		});
	}

	function closeMenu() {
		menu?.hidePopover();
	}
</script>

<div class="navbar-end flex-1 gap-2 overflow-hidden">
	<div class="flex flex-col items-end gap-1 overflow-hidden">
		<div dir="rtl" class="w-full truncate text-right font-semibold">
			{user.name}
		</div>

		<button
			class="badge cursor-pointer badge-soft badge-xs font-semibold hover:bg-primary hover:text-primary-content"
			onclick={openTargetModal}
			aria-busy={profileQuery.current === undefined}
			title="Change target">
			{#if profileQuery.current === undefined}
				<span class="skeleton inline-block h-3 w-14 align-middle" aria-hidden="true"></span>
			{:else}
				Target Band: {profileQuery.current.bandTarget ?? 0}
			{/if}
		</button>
	</div>

	<div class="avatar shrink-0">
		<button
			class="cursor-pointer"
			style="anchor-name: --avatar"
			popovertarget="avatar-popover"
			title="Open Menu">
			{#if user.image}
				<img
					class="aspect-square w-10 rounded-full ring ring-base-content/20"
					src={user.image}
					alt={user.name} />
			{:else}
				<InitialsAvatar name={user.name} />
			{/if}
		</button>

		<ul
			class="menu dropdown rounded-box bg-base-100 text-nowrap shadow-sm"
			style="position-anchor: --avatar"
			id="avatar-popover"
			popover="auto"
			bind:this={menu}>
			{#if user.role === "admin"}
				<li>
					<a class="justify-end" href={resolve("/admin")} onclick={closeMenu}>
						Admin
						<Shield class="size-[1em]" />
					</a>
				</li>
			{/if}
			<li>
				<button
					class="justify-end active:bg-primary active:text-primary-content"
					onclick={() => {
						closeMenu();
						openThemeModal();
					}}>
					Change theme
					<Palette class="size-[1em]" />
				</button>
			</li>

			<div class="divider mt-2 mb-0 divider-error"></div>

			<li>
				<button
					class="w-full justify-end text-error hover:bg-error hover:text-error-content active:bg-error active:text-error-content"
					onclick={() => {
						closeMenu();
						openSignOutModal();
					}}>
					Sign Out
					<LogOut class="size-[1em]" />
				</button>
			</li>
		</ul>
	</div>
</div>
