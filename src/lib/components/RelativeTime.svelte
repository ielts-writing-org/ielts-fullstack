<script lang="ts">
	import { formatRelativeTime } from "#lib/utils/time.ts";

	type Props = { value: Date | number };
	let { value }: Props = $props();
</script>

<time datetime={new Date(value).toISOString()} title={new Date(value).toLocaleString()}>
	{formatRelativeTime(value)}
</time>
