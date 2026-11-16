import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { aiSettings } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";

export const CONFIGS = {
	cacheTtl: 86_400,
	chatPromptPrefix: "chat-prompt-",
	evaluationPromptPrefix: "evaluation-prompt-"
};

export async function getPromptOverride(key: string): Promise<string | null> {
	const db = getDb(env.IELTS_WRITING_DB.withSession("first-primary"));
	const [setting] = await db
		.select({ value: aiSettings.value })
		.from(aiSettings)
		.where(eq(aiSettings.key, key))
		.limit(1);
	return setting?.value ?? null;
}
