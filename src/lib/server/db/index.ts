import { drizzle as drizzleD1, DrizzleD1Database } from "drizzle-orm/d1";
import * as authSchema from "./auth.schema";
import * as appSchema from "./app.schema";
import { env } from "cloudflare:workers";

const schema = { ...authSchema, ...appSchema };

export type AppDb = DrizzleD1Database<typeof schema>;

type D1Binding = D1Database | D1DatabaseSession;

export const getDb = (d1: D1Binding): AppDb => drizzleD1(d1 as D1Database, { schema });

export function getDatabase(): AppDb {
	return getDb(env.IELTS_WRITING_DB);
}
