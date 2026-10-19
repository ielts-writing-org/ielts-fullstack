import { env } from "cloudflare:workers";

import type { TaskCategory } from "#lib/schemas/task-category.ts";

const CONFIGS = {
	cacheTtl: 86_400,
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
		const value = await this.kvNamespace.get(key + taskCategory, { cacheTtl: CONFIGS.cacheTtl });

		if (value === null) throw new ConfigMissingError(key, taskCategory);

		return value;
	}
}
