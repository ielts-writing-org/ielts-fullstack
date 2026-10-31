<script lang="ts">
	import { marked } from "marked";
	import sanitize from "sanitize-html";
	import { onMount } from "svelte";

	let pp = $state<string>("");

	onMount(async () => {
		const req = await fetch("/pp.md");
		pp = await req.text();
	});
</script>

<svelte:head>
	<title>Privacy Policy | IELTS Writing Practice Platform</title>
	<meta name="description" content="IELTS Writing Practice Platform Privacy Policy" />
</svelte:head>

<div
	class={[
		"prose max-w-3xl self-center p-4 font-['Times']",
		"prose-headings:font-bold prose-headings:text-primary",
		"prose-h1:text-center",
		"prose-h2:mt-2 prose-h2:mb-1 ",
		"prose-h3:mt-2 prose-h3:mb-1 prose-h3:indent-2",
		"prose-a:link prose-a:link-primary! prose-a:link-hover!"
	]}>
	{@html sanitize(marked.parse(pp, { async: false }))}
</div>
