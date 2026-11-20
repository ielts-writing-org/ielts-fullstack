<script lang="ts" module>
	import {
		getDefaultTheme,
		getThemesByGroupAsArray,
		sanitizeTheme,
		type ThemeName
	} from "#lib/domain/theme.ts";

	let currentTheme = $state<ThemeName>("light");

	export async function resetTheme() {
		currentTheme = getDefaultTheme();
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
		const userTheme = document.documentElement.getAttribute("data-theme");
		currentTheme = userTheme ? sanitizeTheme(userTheme) : getDefaultTheme();
	});
</script>

<select
	class="select select-sm"
	name="theme"
	aria-label="Theme switcher"
	onchange={handleThemeChange}
	bind:value={currentTheme}>
	{#each getThemesByGroupAsArray() as group (group)}
		<optgroup label={group[0]}>
			{#each group[1] as theme (theme)}
				<option value={theme.value}>{theme.name}</option>
			{/each}
		</optgroup>
	{/each}
</select>
