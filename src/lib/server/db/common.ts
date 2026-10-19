import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core";
import { randomUUIDv7 } from "node:crypto";

export const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export function withBaseColumns() {
	return {
		createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
		deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
		id: text("id").primaryKey().$defaultFn(randomUUIDv7),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.notNull()
			.default(now)
			.$onUpdate(() => new Date())
	};
}
