import { relations, sql } from "drizzle-orm";
import { check, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";
import { now, withBaseColumns } from "./common";

/******************************************************************************
 *                                                                            *
 *                                  TABLES                                    *
 *                                                                            *
 *****************************************************************************/
export const profile = sqliteTable("profile", {
	...withBaseColumns(),

	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),

	target: real("target").notNull().default(0),
	theme: text("theme").notNull().default("light")
});

export const task = sqliteTable("task", {
	...withBaseColumns(),

	userId: text("user_id").references(() => user.id, { onDelete: "set null" }),

	category: text("category", { enum: ["1", "2"] }).notNull(), // task 1, task 2
	subcategory: text("subcategory").notNull().default("uncategorized"), // uncategorized, bar chart, pie chart, map, ...
	prompt: text("prompt").notNull(),
	image: text("image")
});

export const practiceSession = sqliteTable("practice_session", {
	...withBaseColumns(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	taskId: text("task_id")
		.notNull()
		.references(() => task.id, { onDelete: "restrict" }),

	name: text("name").notNull(),
	type: text("type", { enum: ["free", "timed"] }).notNull(),
	response: text("response").notNull(),
	timeUpAction: text("time_up_action", { enum: ["stop", "continue"] }),
	startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().default(now)
});

export const chatSession = sqliteTable("chat_session", {
	...withBaseColumns(),

	practiceId: text("id")
		.notNull()
		.references(() => practiceSession.id, { onDelete: "cascade" })
});

export const chatMessage = sqliteTable("chat_message", {
	...withBaseColumns(),
	chatSessionId: text("chat_session_id")
		.notNull()
		.references(() => chatSession.id, { onDelete: "cascade" }),

	from: text("from").notNull(),
	message: text("message").notNull()
});

export const evaluation = sqliteTable(
	"evaluation",
	{
		...withBaseColumns(),

		practiceId: text("id")
			.notNull()
			.references(() => practiceSession.id, { onDelete: "cascade" }),

		overallBand: real("overall_band").notNull()
	},
	(table) => [
		check(
			"ck_overall_band",
			sql`${table.overallBand} >= 0 AND ${table.overallBand} <= 9 AND (${table.overallBand} * 2) % 1 = 0`
		)
	]
);

export const criterion = sqliteTable(
	"criterion",
	{
		...withBaseColumns(),

		evaluationId: text("evaluation_id")
			.notNull()
			.references(() => evaluation.id, { onDelete: "cascade" }),

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

export type Profile = typeof profile.$inferSelect;
export type Task = typeof task.$inferSelect;
export type PracticeSession = typeof practiceSession.$inferSelect;
export type ChatSession = typeof chatSession.$inferSelect;
export type ChatMessage = typeof chatMessage.$inferSelect;
export type Evaluation = typeof evaluation.$inferSelect;
export type Criterion = typeof criterion.$inferSelect;

/******************************************************************************
 *                                                                            *
 *                                RELATIONS                                   *
 *                                                                            *
 *****************************************************************************/
export const taskRelations = relations(task, ({ many, one }) => ({
	practiceSessions: many(practiceSession),
	user: one(user, {
		fields: [task.userId],
		references: [user.id]
	})
}));

export const practiceSessionRelations = relations(practiceSession, ({ one, many }) => ({
	task: one(task, {
		fields: [practiceSession.taskId],
		references: [task.id]
	}),
	chatSessions: many(chatSession),
	evaluation: one(evaluation)
}));

export const chatSessionRelations = relations(chatSession, ({ one }) => ({
	practiceSession: one(practiceSession, {
		fields: [chatSession.practiceId],
		references: [practiceSession.id]
	})
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
	chatSession: one(chatSession, {
		fields: [chatMessage.chatSessionId],
		references: [chatSession.id]
	})
}));

export const evaluationRelations = relations(evaluation, ({ many, one }) => ({
	practiceSession: one(practiceSession, {
		fields: [evaluation.practiceId],
		references: [practiceSession.id]
	}),
	criteria: many(criterion)
}));

export const criterionRelations = relations(criterion, ({ one }) => ({
	evaluation: one(evaluation, {
		fields: [criterion.evaluationId],
		references: [evaluation.id]
	})
}));
