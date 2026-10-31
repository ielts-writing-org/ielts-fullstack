import type { TaskCategory } from "#lib/schemas/task-category.ts";
import type { ConfigProvider } from "./config-provider.port";
import { CONFIGS } from "./config";
import { ConfigMissingError } from "./error";

export class CfConfigProvider implements ConfigProvider {
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
