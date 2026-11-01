<script lang="ts">
	import { getStaticAsset } from "#lib/utils/static-asset.ts";
	import { marked } from "marked";
	import sanitize from "sanitize-html";
	import { onMount } from "svelte";

	let content = $state<string>("");

	onMount(async () => {
		content = await getStaticAsset("tos.md");
	});
</script>

<svelte:head>
	<title>Terms of Service | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Terms of Service" />
</svelte:head>

{@html sanitize(marked.parse(content, { async: false }))}
