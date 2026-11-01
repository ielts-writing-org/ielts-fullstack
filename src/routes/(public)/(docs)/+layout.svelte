<script lang="ts">
	import type { LayoutProps } from "./$types";

	let { children }: LayoutProps = $props();
</script>

<div
	class={[
		"prose max-w-3xl self-center p-4 font-['Times']",
		"prose-headings:font-bold prose-headings:text-primary",
		"prose-h1:text-center",
		"prose-h2:mt-2 prose-h2:mb-1 ",
		"prose-h3:mt-2 prose-h3:mb-1 prose-h3:indent-2",
		"prose-a:link prose-a:link-primary! prose-a:link-hover!"
	]}>
	{@render children()}
</div>
