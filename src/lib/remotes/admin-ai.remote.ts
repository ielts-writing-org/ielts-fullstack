import { command, getRequestEvent, query } from "$app/server";
import { getAdminSession } from "#lib/server/auth/session.ts";
import { recordAdminAction } from "#lib/server/data/admin-audit-logs.ts";
import {
	getStoredAiSettings,
	upsertAiSetting,
	upsertAiSettings
} from "#lib/server/data/ai-settings.ts";
import { countAiRequests, listAiRequests } from "#lib/server/data/ai-requests.ts";
import {
	AI_CHAT_MODEL_OPTIONS,
	AI_GRADING_MODEL_OPTIONS,
	DEFAULT_AI_RUNTIME
} from "#lib/domain/ai-config.ts";
import {
	getAdminAiRequestsInput,
	saveAdminAiConfigInput,
	saveAdminPromptInput
} from "./admin-ai.schema.ts";

export const getAdminAiRequests = query(
	getAdminAiRequestsInput,
	async ({ page, pageSize, kind, status, model, days }) => {
		await getAdminSession(getRequestEvent().locals);
		const filters = { page, pageSize, kind, status, model, days };
		const [total, requests] = await Promise.all([
			countAiRequests(filters),
			listAiRequests(filters)
		]);
		return { requests, page, pageSize, total };
	}
);

export const getAdminAiConfig = query(async () => {
	await getAdminSession(getRequestEvent().locals);
	const promptKeys = [
		"chat-prompt-1",
		"chat-prompt-2",
		"evaluation-prompt-1",
		"evaluation-prompt-2"
	] as const;
	const stored = await getStoredAiSettings([...promptKeys, ...Object.keys(DEFAULT_AI_RUNTIME)]);
	const prompts: Record<(typeof promptKeys)[number], string> = {
		"chat-prompt-1": "",
		"chat-prompt-2": "",
		"evaluation-prompt-1": "",
		"evaluation-prompt-2": ""
	};
	const promptSources: Record<(typeof promptKeys)[number], "Database" | "Not configured"> = {
		"chat-prompt-1": "Not configured",
		"chat-prompt-2": "Not configured",
		"evaluation-prompt-1": "Not configured",
		"evaluation-prompt-2": "Not configured"
	};
	for (const key of promptKeys) {
		const value = stored.get(key);
		prompts[key] = value?.trim() ? value : "";
		promptSources[key] = value?.trim() ? "Database" : "Not configured";
	}
	return {
		prompts,
		promptSources,
		settings: Object.fromEntries(stored),
		defaults: DEFAULT_AI_RUNTIME,
		chatModels: AI_CHAT_MODEL_OPTIONS,
		gradingModels: AI_GRADING_MODEL_OPTIONS
	};
});

export const saveAdminAiConfig = command(saveAdminAiConfigInput, async (input) => {
	const { user } = await getAdminSession(getRequestEvent().locals);
	const rows = Object.entries(input).map(([key, value]) => ({
		key,
		value: String(value),
		updatedBy: user.id
	}));
	await upsertAiSettings(rows);
	await recordAdminAction(user.id, "ai.config.update", "ai_config", null, { ...input });
	return { success: true };
});

export const saveAdminPrompt = command(saveAdminPromptInput, async ({ key, prompt }) => {
	const { user } = await getAdminSession(getRequestEvent().locals);
	await upsertAiSetting(key, prompt, user.id);
	await recordAdminAction(user.id, "ai.prompt.update", "ai_setting", key, {
		storage: "ai_settings",
		characters: prompt.length
	});
	return { success: true };
});
