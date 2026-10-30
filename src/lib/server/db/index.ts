import { drizzle as drizzleD1, DrizzleD1Database } from "drizzle-orm/d1";
import * as authSchema from "./auth.schema";
import * as appSchema from "./app.schema";

const schema = { ...authSchema, ...appSchema };

export type AppDb = DrizzleD1Database<typeof schema>;

export const getDb = (d1: D1Database): AppDb => drizzleD1(d1, { schema });
