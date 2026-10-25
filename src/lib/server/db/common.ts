import { sql } from "drizzle-orm";
import { integer, text, type SQLiteColumnBuilderBase } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";

export const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export function withBaseColumns<TColumnsMap extends Record<string, SQLiteColumnBuilderBase>>(
	columns: TColumnsMap
) {
	return {
		id: text("id").primaryKey().$defaultFn(uuidv7),
		...columns,
		createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.notNull()
			.default(now)
			.$onUpdate(() => new Date()),
		deletedAt: integer("deleted_at", { mode: "timestamp_ms" })
	};
}
