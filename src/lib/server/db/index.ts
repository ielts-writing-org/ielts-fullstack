import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "./auth.schema";
import * as appSchema from "./app.schema";

export const getDb = (d1: D1Database) => drizzle(d1, { schema: { ...authSchema, ...appSchema } });
