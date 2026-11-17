import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import { relations } from "./app.relations";
import { authRelations } from "./auth.schema";

export const getDb = (d1: D1Database) => {
	return drizzleD1(d1, { relations: { ...relations, ...authRelations } });
};

export function getDatabase() {
	return getDb(env.IELTS_WRITING_DB);
}
