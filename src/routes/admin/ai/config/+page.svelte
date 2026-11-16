<script lang="ts">
	import { onMount } from "svelte";
	import { getAdminAiConfig } from "#lib/remotes/query/admin-data.remote.ts";
	import { saveAdminAiConfig, saveAdminPrompt } from "#lib/remotes/command/admin.remote.ts";

	type Config = Awaited<ReturnType<typeof getAdminAiConfig>>;
	type Model = "@cf/google/gemma-4-26b-a4b-it" | "@cf/meta/llama-4-scout-17b-16e-instruct";
	type GradingModel = Config["gradingModels"][number];
	type PromptKey = "chat-prompt-1" | "chat-prompt-2" | "evaluation-prompt-1" | "evaluation-prompt-2";
	const prompts: { key: PromptKey; title: string; description: string }[] = [
		{ key: "evaluation-prompt-1", title: "Task 1 evaluation prompt", description: "Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy." },
		{ key: "evaluation-prompt-2", title: "Task 2 evaluation prompt", description: "Task Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy." },
		{ key: "chat-prompt-1", title: "AI Tutor prompt · Task 1", description: "System prompt used by AI Tutor for Task 1 practice." },
		{ key: "chat-prompt-2", title: "AI Tutor prompt · Task 2", description: "System prompt used by AI Tutor for Task 2 practice." }
	];
	type Form = {
		chatModel: Model;
		gradingModel: GradingModel;
		enableThinking: boolean;
		maxOutputTokens: number;
		seed: number;
		temperature: number;
		chatDailyLimit: number;
		gradingDailyLimit: number;
		"chat-prompt-1": string;
		"chat-prompt-2": string;
		"evaluation-prompt-1": string;
		"evaluation-prompt-2": string;
	};
	let form = $state<Form | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let savingPrompt = $state(false);
	let editingPrompt = $state<PromptKey | null>(null);
	let promptBeforeEdit = $state("");
	let errorMessage = $state("");
	let message = $state("");
	let config = $state<Config | null>(null);

	async function load() {
		loading = true; errorMessage = "";
		try {
			const query = getAdminAiConfig();
			await query.refresh();
			config = await query;
			const value = (key: string, fallback: number) => {
				const parsed = Number(config!.settings[key]);
				return Number.isFinite(parsed) ? parsed : fallback;
			};
			const chatModel = (fallback: Model): Model => {
				const candidate = config!.settings.chatModel as Model | undefined;
				return candidate && config!.chatModels.includes(candidate) ? candidate : fallback;
			};
			const gradingModel = () => {
				const candidate = config!.settings.gradingModel;
				return config!.gradingModels.find((option) => option === candidate) ?? config!.defaults.gradingModel;
			};
			form = {
				chatModel: chatModel(config.defaults.chatModel),
				gradingModel: gradingModel(),
				enableThinking: config.settings.enableThinking === "true" || (!config.settings.enableThinking && config.defaults.enableThinking),
				maxOutputTokens: value("maxOutputTokens", config.defaults.maxOutputTokens),
				seed: value("seed", config.defaults.seed),
				temperature: value("temperature", config.defaults.temperature),
				chatDailyLimit: value("chatDailyLimit", config.defaults.chatDailyLimit),
				gradingDailyLimit: value("gradingDailyLimit", config.defaults.gradingDailyLimit),
				"chat-prompt-1": config.prompts["chat-prompt-1"],
				"chat-prompt-2": config.prompts["chat-prompt-2"],
				"evaluation-prompt-1": config.prompts["evaluation-prompt-1"],
				"evaluation-prompt-2": config.prompts["evaluation-prompt-2"]
			};
		} catch (cause) { errorMessage = cause instanceof Error ? cause.message : "Could not load AI configuration."; }
		finally { loading = false; }
	}
	onMount(() => void load());
	async function save() {
		if (!form || editingPrompt) return;
		saving = true; errorMessage = ""; message = "";
		try {
			await saveAdminAiConfig({
				chatModel: form.chatModel,
				gradingModel: form.gradingModel,
				enableThinking: form.enableThinking,
				maxOutputTokens: form.maxOutputTokens,
				seed: form.seed,
				temperature: form.temperature,
				chatDailyLimit: form.chatDailyLimit,
				gradingDailyLimit: form.gradingDailyLimit
			});
			message = "AI settings saved. New model parameters are used on subsequent requests.";
		} catch (cause) { errorMessage = cause instanceof Error ? cause.message : "Could not save AI configuration."; }
		finally { saving = false; }
	}
	function editPrompt(key: PromptKey) {
		if (!form || editingPrompt) return;
		promptBeforeEdit = form[key];
		editingPrompt = key;
		errorMessage = "";
		message = "";
	}
	function cancelPromptEdit() {
		if (form && editingPrompt) form[editingPrompt] = promptBeforeEdit;
		editingPrompt = null;
		promptBeforeEdit = "";
	}
	async function savePrompt(key: PromptKey) {
		if (!form || editingPrompt !== key) return;
		savingPrompt = true;
		errorMessage = "";
		message = "";
		try {
			await saveAdminPrompt({ key, prompt: form[key] });
			if (config) {
				config = {
					...config,
					prompts: { ...config.prompts, [key]: form[key] },
					promptSources: { ...config.promptSources, [key]: "Cloudflare KV" }
				};
			}
			editingPrompt = null;
			promptBeforeEdit = "";
			message = `${prompts.find((prompt) => prompt.key === key)?.title ?? "Prompt"} saved to Cloudflare KV. Edge caches may take up to about 60 seconds to refresh.`;
		} catch (cause) { errorMessage = cause instanceof Error ? cause.message : "Could not save this prompt."; }
		finally { savingPrompt = false; }
	}
</script>

<svelte:head><title>AI Configuration · Admin</title></svelte:head>
<div>
	<p class="text-xs font-bold uppercase tracking-[0.14em] text-primary">System settings</p>
	<h1 class="mt-1 text-3xl font-bold tracking-tight">AI Configuration</h1>
	<p class="mt-1 text-sm text-base-content/70">Configure the existing Workers AI chat and grading streams.</p>
</div>
{#if message}<div class="alert alert-success mt-4" role="status">{message}</div>{/if}
{#if errorMessage}<div class="alert alert-error mt-4" role="alert">{errorMessage}<button class="btn btn-sm" onclick={() => void load()}>Reload</button></div>{/if}

{#if loading}<div class="alert mt-4" role="status"><span class="loading loading-spinner loading-sm"></span>Loading current configuration…</div>
{:else if form && config}
	<form class="mt-4 flex flex-col gap-5" onsubmit={(event) => { event.preventDefault(); void save(); }}>
		<section class="admin-panel"><div class="card-body gap-5 p-4 sm:p-6">
			<div><h2 class="text-lg font-bold">Workers AI model parameters</h2><p class="mt-1 text-sm text-base-content/65">Choose supported models and tune the parameters used by current streams.</p></div>
			<div class="grid gap-5 sm:grid-cols-2">
			<label class="admin-field"><span class="admin-field-label">Chat model</span><select class="select select-bordered w-full" bind:value={form.chatModel}>{#each config.chatModels as model (model)}<option value={model}>{model}</option>{/each}</select></label>
			<label class="admin-field"><span class="admin-field-label">Grading model</span><select class="select select-bordered w-full" bind:value={form.gradingModel}>{#each config.gradingModels as model (model)}<option value={model}>{model}</option>{/each}</select><span class="text-xs leading-5 text-base-content/60">Only models compatible with the current streamed evaluation JSON contract are offered.</span></label>
				<label class="admin-field"><span class="admin-field-label">Maximum output tokens</span><input class="input input-bordered w-full" type="number" min="128" max="8192" step="1" bind:value={form.maxOutputTokens} /></label>
				<label class="admin-field"><span class="admin-field-label">Temperature</span><input class="input input-bordered w-full" type="number" min="0" max="2" step="0.1" bind:value={form.temperature} /></label>
				<label class="admin-field"><span class="admin-field-label">Seed</span><input class="input input-bordered w-full" type="number" min="0" max="2147483647" step="1" bind:value={form.seed} /></label>
				<label class="flex min-h-16 items-center gap-3 rounded-xl border border-base-content/10 bg-base-200/30 px-4 py-3"><input class="toggle toggle-primary shrink-0" type="checkbox" bind:checked={form.enableThinking} /><span><span class="block text-sm font-semibold">AI Tutor thinking mode</span><span class="mt-1 block text-xs text-base-content/60">Enable extended reasoning for Tutor replies.</span></span></label>
			</div>
			<p class="text-xs leading-5 text-base-content/60">The model list is restricted to the Workers AI models already used by the application-compatible streaming and grading contracts.</p>
		</div></section>

		<section class="admin-panel"><div class="card-body gap-5 p-4 sm:p-6">
			<div><h2 class="text-lg font-bold">Per-user quota</h2><p class="mt-1 text-sm text-base-content/70">Limits reset daily at 00:00 UTC. Failed and cancelled requests count once reserved. Set 0 for unlimited.</p></div>
			<div class="grid gap-5 sm:grid-cols-2">
				<label class="admin-field"><span class="admin-field-label">Grading attempts per user per day</span><input class="input input-bordered w-full" type="number" min="0" max="500" step="1" bind:value={form.gradingDailyLimit} /></label>
				<label class="admin-field"><span class="admin-field-label">Tutor chat attempts per user per day</span><input class="input input-bordered w-full" type="number" min="0" max="1000" step="1" bind:value={form.chatDailyLimit} /></label>
			</div>
		</div></section>

		<section class="admin-panel"><div class="card-body gap-5 p-4 sm:p-6">
					<div><h2 class="text-lg font-bold">Prompt configuration</h2><p class="mt-1 text-sm text-base-content/70">Prompts are loaded from the IELTS_WRITING_KV namespace. Existing non-empty D1 prompt values are used only when the matching KV key is absent. Editing a prompt saves it to KV.</p></div>
			{#each prompts as prompt (prompt.key)}
				{@const promptText = form[prompt.key]}
				{@const isEditing = editingPrompt === prompt.key}
				<article class="rounded-2xl border border-base-content/10 bg-base-100 p-4 sm:p-5">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div><h3 class="font-semibold">{prompt.title}</h3><p class="mt-1 text-sm text-base-content/65">{prompt.description}</p></div>
						<div class="flex items-center gap-2"><span class="badge badge-ghost">{config.promptSources[prompt.key]}</span>{#if !isEditing}<button type="button" class="btn btn-outline btn-sm" disabled={saving || savingPrompt || editingPrompt !== null} onclick={() => editPrompt(prompt.key)}>Edit</button>{/if}</div>
					</div>
					{#if isEditing}
						<label class="admin-field mt-4"><span class="admin-field-label">Prompt text</span><textarea class="textarea textarea-bordered min-h-48 w-full font-mono text-xs leading-5" maxlength="30000" required disabled={savingPrompt} bind:value={form[prompt.key]}></textarea></label>
						<div class="mt-3 flex justify-end gap-2"><button type="button" class="btn btn-ghost btn-sm" disabled={savingPrompt} onclick={cancelPromptEdit}>Cancel</button><button type="button" class="btn btn-primary btn-sm" disabled={savingPrompt || !form[prompt.key].trim()} onclick={() => void savePrompt(prompt.key)}>{savingPrompt ? "Saving…" : "Save prompt"}</button></div>
					{:else if promptText.trim()}
						<pre class="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-base-200/60 p-4 font-mono text-xs leading-5">{promptText}</pre>
					{:else}
						<div class="alert alert-warning mt-4" role="status">No prompt was found in KV or the legacy D1 fallback for this task. Use Edit to add the prompt.</div>
					{/if}
				</article>
			{/each}
		</div></section>
		<div class="sticky bottom-3 z-10 flex justify-end rounded-2xl border border-base-content/10 bg-base-100/95 p-3 shadow-lg backdrop-blur"><button class="btn btn-primary" type="submit" disabled={saving || savingPrompt || editingPrompt !== null}>{saving ? "Saving…" : "Save configuration"}</button></div>
	</form>
{/if}
