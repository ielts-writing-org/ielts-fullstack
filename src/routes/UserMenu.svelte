<script lang="ts">
	import { LogOut, Palette } from "@lucide/svelte";
	import { authClient } from "#lib/auth/auth-client.ts";
	import { openModal } from "#lib/components/Modal.svelte";
	import ChangeBandTarget from "./ChangeBandTarget.svelte";
	import ChangeTheme from "./ChangeTheme.svelte";
	import { resetTheme } from "#lib/components/ThemeController.svelte";
	import { refreshAll } from "$app/navigation";

	type Props = {
		user: {
			name: string;
			image?: string | null;
		};
		profile: {
			bandTarget: number;
		};
	};

	let props: Props = $props();

	let target = $derived(props.profile.bandTarget);

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
						await resetTheme();
						await refreshAll();
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
			},
			bypassBusy: true
		});
	}

	function handleChangeTarget() {
		openModal({
			title: "Change target band",
			content: { component: ChangeBandTarget, props: { bandTarget: props.profile.bandTarget } }
		});
	}

	function handleChangeTheme() {
		openModal({
			title: "Change theme",
			content: { component: ChangeTheme, props: {} }
		});
	}
</script>

<div class="flex flex-col items-end gap-1 overflow-hidden">
	<div dir="rtl" class="w-full truncate text-left font-semibold">
		{props.user.name}
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
		<img
			class="w-10 rounded-full ring ring-base-content/20"
			src={props.user.image}
			alt={props.user.name} />
	</button>

	<ul
		class="menu dropdown rounded-box bg-base-100 text-nowrap shadow-sm"
		style="position-anchor: --avatar"
		id="avatar-popover"
		popover="auto">
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
