import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as authSchema from "./auth.schema";
import * as appSchema from "./app.schema";
import { env } from "cloudflare:workers";

const schema = { ...authSchema, ...appSchema };

export const getDb = (d1: D1Database) => drizzleD1(d1, { schema });

export function getDatabase() {
	return getDb(env.IELTS_WRITING_DB);
}
