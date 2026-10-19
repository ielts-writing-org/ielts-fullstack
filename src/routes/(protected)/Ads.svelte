<script>
	import { Check, MessageCircle, Sparkles } from "@lucide/svelte";
</script>

<div class="relative min-h-37.75 overflow-hidden rounded-box bg-[#10182e] p-4">
	<div class="flex gap-1 text-xs font-bold text-[#8293f2]">
		<MessageCircle size="1em" />
		AI TUTOR
	</div>
	<h2 class="mt-2 text-sm font-semibold text-white">Guidance While You Write</h2>
	<p class="max-w-[320px] text-xs text-white/50">
		Get contextual hints mapped to official IELTS criteria right as you construct paragraphs. No
		full essay rewrites - pure guided learning.
	</p>
	<div class="mt-6 flex flex-wrap gap-3 text-xs font-semibold">
		<span class="text-success"><Check size="1em" /> Sentence-level cues</span>
		<span class="text-warning"><Check size="1em" /> Socratic questions</span>
		<span class="text-info"><Check size="1em" /> 4-criteria checks</span>
	</div>
	<Sparkles class="absolute top-4 right-4 text-warning" size="1.5em" />
</div>
