import { inArray, sql } from "drizzle-orm";
import { aiSettings } from "../db/app.schema";
import { getDatabase } from "../db/index.ts";

export async function getStoredAiSettings(keys: readonly string[]) {
	if (!keys.length) return new Map<string, string>();
	const rows = await getDatabase()
		.select()
		.from(aiSettings)
		.where(inArray(aiSettings.key, [...keys]));
	return new Map(rows.map(({ key, value }) => [key, value]));
}

export function upsertAiSettings(rows: { key: string; value: string; updatedBy: string }[]) {
	return getDatabase()
		.insert(aiSettings)
		.values(rows)
		.onConflictDoUpdate({
			target: aiSettings.key,
			set: {
				value: sql`excluded.value`,
				updatedBy: sql`excluded.updated_by`,
				updatedAt: new Date()
			}
		});
}

export function upsertAiSetting(key: string, value: string, updatedBy: string) {
	return getDatabase()
		.insert(aiSettings)
		.values({ key, value, updatedBy })
		.onConflictDoUpdate({
			target: aiSettings.key,
			set: { value, updatedBy, updatedAt: new Date() }
		});
}
