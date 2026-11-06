<script lang="ts">
	import { getStaticAsset } from "#lib/utils/static-asset.ts";
	import { marked } from "marked";
	import sanitize from "sanitize-html";
	import { onMount } from "svelte";

	let content = $state<string>("");

	onMount(async () => {
		content = await getStaticAsset("pp.md");
	});
</script>

<svelte:head>
	<title>Privacy Policy | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Privacy Policy" />
</svelte:head>

{@html sanitize(marked.parse(content, { async: false }))}
