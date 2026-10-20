import { relations, sql } from "drizzle-orm";
import { check, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./auth.schema";
import { now, withBaseColumns } from "./common";

/******************************************************************************
 *                                                                            *
 *                                  TABLES                                    *
 *                                                                            *
 *****************************************************************************/
export const profiles = sqliteTable("profiles", {
	...withBaseColumns(),

	userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),

	target: real("target").notNull().default(0),
	theme: text("theme").notNull().default("light")
});

export const tasks = sqliteTable("tasks", {
	...withBaseColumns(),

	userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

	category: text("category", { enum: ["1", "2"] }).notNull(), // task 1, task 2
	subcategory: text("subcategory").notNull().default("uncategorized"), // uncategorized, bar chart, pie chart, map, ...
	prompt: text("prompt").notNull(),
	image: text("image")
});

export const practiceSessions = sqliteTable("practice_sessions", {
	...withBaseColumns(),
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
});

export const chatSessions = sqliteTable("chat_sessions", {
	...withBaseColumns(),

	practiceId: text("id")
		.notNull()
		.references(() => practiceSessions.id, { onDelete: "cascade" })
});

export const chatMessages = sqliteTable("chat_messages", {
	...withBaseColumns(),
	chatSessionId: text("chat_session_id")
		.notNull()
		.references(() => chatSessions.id, { onDelete: "cascade" }),

	from: text("from").notNull(),
	message: text("message").notNull()
});

export const evaluations = sqliteTable(
	"evaluations",
	{
		...withBaseColumns(),

		practiceId: text("id")
			.notNull()
			.references(() => practiceSessions.id, { onDelete: "cascade" }),

		overallBand: real("overall_band").notNull()
	},
	(table) => [
		check(
			"ck_overall_band",
			sql`${table.overallBand} >= 0 AND ${table.overallBand} <= 9 AND (${table.overallBand} * 2) % 1 = 0`
		)
	]
);

export const criteria = sqliteTable(
	"criteria",
	{
		...withBaseColumns(),

		evaluationId: text("evaluation_id")
			.notNull()
			.references(() => evaluations.id, { onDelete: "cascade" }),

		name: text("name", {
			enum: [
				"task_response",
				"coherence_and_cohesion",
				"lexical_resource",
				"grammatical_range_and_accuracy"
			]
		}).notNull(),
		band: real("band").notNull(),
		checks: text("checks", { mode: "json" }).notNull(),
		problems: text("problems", { mode: "json" }).notNull(),
		whyThisBand: text("why_this_band").notNull(),
		whyNotNextBand: text("why_not_next_band")
	},
	(table) => [
		check("ck_band", sql`${table.band} >= 0 AND ${table.band} <= 9 AND (${table.band} * 2) % 1 = 0`)
	]
);

export type ProfileEntity = typeof profiles.$inferSelect;
export type TaskEntity = typeof tasks.$inferSelect;
export type PracticeSessionEntity = typeof practiceSessions.$inferSelect;
export type ChatSessionEntity = typeof chatSessions.$inferSelect;
export type ChatMessageEntity = typeof chatMessages.$inferSelect;
export type EvaluationEntity = typeof evaluations.$inferSelect;
export type CriterionEntity = typeof criteria.$inferSelect;

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
		fields: [chatSessions.practiceId],
		references: [practiceSessions.id]
	})
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
	chatSession: one(chatSessions, {
		fields: [chatMessages.chatSessionId],
		references: [chatSessions.id]
	})
}));

export const evaluationsRelations = relations(evaluations, ({ many, one }) => ({
	practiceSession: one(practiceSessions, {
		fields: [evaluations.practiceId],
		references: [practiceSessions.id]
	}),
	criteria: many(criteria)
}));

export const criterionsRelations = relations(criteria, ({ one }) => ({
	evaluation: one(evaluations, {
		fields: [criteria.evaluationId],
		references: [evaluations.id]
	})
}));
