<script lang="ts">
	import { getStaticAssetAsText } from "#lib/utils/static-asset.ts";
	import { marked } from "marked";
	import sanitize from "sanitize-html";
	import { onMount } from "svelte";

	type Props = {
		file: Parameters<typeof getStaticAssetAsText>[0];
		title: string;
		description: string;
	};

	const { file, title, description }: Props = $props();

	let content = $state<string>("");

	onMount(async () => {
		content = await getStaticAssetAsText(file);
	});
</script>

<svelte:head>
	<title>{title} | IELTS Writing Practice Platform</title>
	<meta name="description" content={description} />
</svelte:head>

{@html sanitize(marked.parse(content, { async: false }))}
