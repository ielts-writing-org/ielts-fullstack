<script lang="ts" module>
	const themeGroups = {
		"Light theme": [
			{ themeName: "Light", themeValue: "light" },
			{ themeName: "Winter", themeValue: "winter" }
		],
		"Dark theme": [
			{ themeName: "Dark", themeValue: "dark" },
			{ themeName: "Forest", themeValue: "forest" },
			{ themeName: "Night", themeValue: "night" }
		]
	} as const;

	type ThemeNames = (typeof themeGroups)[keyof typeof themeGroups][number]["themeValue"];

	let currentTheme = $state<ThemeNames>("light");

	export async function resetTheme() {
		currentTheme = "light";
		document.documentElement.setAttribute("data-theme", currentTheme);
		await cookieStore.delete("theme");
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";

	async function handleThemeChange() {
		document.documentElement.setAttribute("data-theme", currentTheme);
		await cookieStore.set({ name: "theme", value: currentTheme });
	}

	onMount(() => {
		currentTheme = (document.documentElement.getAttribute("data-theme") as ThemeNames) ?? "light";
	});
</script>

<select
	class="select select-sm"
	name="theme"
	aria-label="Theme switcher"
	onchange={handleThemeChange}
	value={currentTheme}>
	{#each Object.entries(themeGroups) as themeGroup (themeGroup)}
		<optgroup label={themeGroup[0]}>
			{#each themeGroup[1] as theme (theme)}
				<option value={theme.themeValue}>{theme.themeName}</option>
			{/each}
		</optgroup>
	{/each}
</select>
