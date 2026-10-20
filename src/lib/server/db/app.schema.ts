import type { Evaluation } from "#lib/schemas/evaluation.ts";
import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./auth.schema";
import { now, withBaseColumns } from "./common";

/******************************************************************************
 *                                                                            *
 *                                  TABLES                                    *
 *                                                                            *
 *****************************************************************************/
export const profiles = sqliteTable(
	"profiles",
	withBaseColumns({
		userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),

		target: real("target").notNull().default(0),
		theme: text("theme").notNull().default("light")
	})
);

export const tasks = sqliteTable(
	"tasks",
	withBaseColumns({
		userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

		category: text("category", { enum: ["1", "2"] }).notNull(), // task 1, task 2
		subcategory: text("subcategory").notNull().default("uncategorized"), // uncategorized, bar chart, pie chart, map, ...
		prompt: text("prompt").notNull(),
		image: text("image")
	})
);

export const practiceSessions = sqliteTable(
	"practice_sessions",
	withBaseColumns({
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		taskId: text("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "restrict" }),

		name: text("name").notNull(),
		type: text("type", { enum: ["free", "timed"] }).notNull(),
		response: text("response").notNull(),
		timeUpAction: text("time_up_action", { enum: ["stop", "continue"] }),
		startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().default(now)
	})
);

export const chatSessions = sqliteTable(
	"chat_sessions",
	withBaseColumns({
		practiceSessionId: text("practice_session_id")
			.notNull()
			.references(() => practiceSessions.id, { onDelete: "cascade" })
	})
);

export const chatMessages = sqliteTable(
	"chat_messages",
	withBaseColumns({
		chatSessionId: text("chat_session_id")
			.notNull()
			.references(() => chatSessions.id, { onDelete: "cascade" }),

		from: text("from").notNull(),
		message: text("message").notNull()
	})
);

export const evaluations = sqliteTable(
	"evaluations",
	withBaseColumns({
		practiceSessionId: text("practice_session_id").notNull(),

		result: text("result", { mode: "json" }).$type<Evaluation>().notNull()
	})
);

export type ProfileEntity = typeof profiles.$inferSelect;
export type TaskEntity = typeof tasks.$inferSelect;
export type PracticeSessionEntity = typeof practiceSessions.$inferSelect;
export type ChatSessionEntity = typeof chatSessions.$inferSelect;
export type ChatMessageEntity = typeof chatMessages.$inferSelect;
export type EvaluationEntity = typeof evaluations.$inferSelect;

/******************************************************************************
 *                                                                            *
 *                                RELATIONS                                   *
 *                                                                            *
 *****************************************************************************/
export const tasksRelations = relations(tasks, ({ many, one }) => ({
	practiceSessions: many(practiceSessions),
	user: one(users, {
		fields: [tasks.userId],
		references: [users.id]
	})
}));

export const practiceSessionsRelations = relations(practiceSessions, ({ one, many }) => ({
	task: one(tasks, {
		fields: [practiceSessions.taskId],
		references: [tasks.id]
	}),
	chatSessions: many(chatSessions),
	evaluation: one(evaluations)
}));

export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
	practiceSession: one(practiceSessions, {
		fields: [chatSessions.practiceSessionId],
		references: [practiceSessions.id]
	})
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
	chatSession: one(chatSessions, {
		fields: [chatMessages.chatSessionId],
		references: [chatSessions.id]
	})
}));

export const evaluationsRelations = relations(evaluations, ({ one }) => ({
	practiceSession: one(practiceSessions, {
		fields: [evaluations.practiceSessionId],
		references: [practiceSessions.id]
	})
}));
