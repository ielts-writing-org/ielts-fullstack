import type { TaskId } from "#lib/utils/task-id.ts";
import { ConfigMissingError } from "./config-missing.error";
import type { ConfigProvider } from "./config-provider.port";

const CONFIGS = {
	chatPromptPrefix: "chat-prompt-",
	evaluationPromptPrefix: "evaluation-prompt-",
	cacheTtl: 86_400
};

export class CloudflareConfigProvider implements ConfigProvider {
	constructor(private readonly kvNamespace: KVNamespace) {}

	private async get(taskId: TaskId, key: string): Promise<string> {
		const value = await this.kvNamespace.get(key + taskId, {
			cacheTtl: CONFIGS.cacheTtl
		});

		if (value === null) throw new ConfigMissingError(key, taskId);

		return value;
	}

	getEvaluationPrompt(taskId: TaskId): Promise<string> {
		return this.get(taskId, CONFIGS.evaluationPromptPrefix);
	}

	getChatPrompt(taskId: TaskId): Promise<string> {
		return this.get(taskId, CONFIGS.chatPromptPrefix);
	}
}
