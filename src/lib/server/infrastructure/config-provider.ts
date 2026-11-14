import { env } from "cloudflare:workers";

import type { TaskCategory } from "#lib/domain/task-category.ts";
import { getPromptOverride } from "./config-provider/config.ts";

const CONFIGS = {
	chatPromptPrefix: "chat-prompt-",
	evaluationPromptPrefix: "evaluation-prompt-"
};

export class ConfigMissingError extends Error {
	constructor(
		public readonly key: string,
		public readonly taskCategory: TaskCategory
	) {
		super(`Configuration "${key}" is not configured for task ${taskCategory}`);
	}
}

export class ConfigProvider {
	static get instance() {
		return (ConfigProvider.#instance ??= new ConfigProvider(env.IELTS_WRITING_KV));
	}

	static #instance: ConfigProvider;

	constructor(private readonly kvNamespace: KVNamespace) {}

	getChatPrompt(taskCategory: TaskCategory): Promise<string> {
		return this.get(taskCategory, CONFIGS.chatPromptPrefix);
	}

	getEvaluationPrompt(taskCategory: TaskCategory): Promise<string> {
		return this.get(taskCategory, CONFIGS.evaluationPromptPrefix);
	}

	private async get(taskCategory: TaskCategory, key: string): Promise<string> {
		const promptKey = key + taskCategory;
		// KV is the source of truth for prompts. Keep legacy D1 overrides as a
		// fallback for deployments where the corresponding KV key is not present.
		const value = await this.kvNamespace.get(promptKey, { cacheTtl: 60 });
		if (value !== null) return value;

		const override = await getPromptOverride(promptKey);
		if (override?.trim()) return override;

		throw new ConfigMissingError(key, taskCategory);
	}
}
