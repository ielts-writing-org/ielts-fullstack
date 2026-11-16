import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Evaluation } from "#lib/domain/evaluation.ts";
import type { TaskCategory } from "#lib/domain/task-category.ts";
import type { TaskSubcategory } from "#lib/domain/task-subcategory.ts";
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

		bandTarget: real("band_target"),
		theme: text("theme").notNull().default("light")
	})
);

export const tasks = sqliteTable(
	"tasks",
	withBaseColumns({
		userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

		category: text("category", { enum: ["1", "2"] })
			.$type<TaskCategory>()
			.notNull(),
		subcategory: text("subcategory").$type<TaskSubcategory<TaskCategory>>(),
		topic: text("topic"),
		difficulty: text("difficulty", { enum: ["beginner", "intermediate", "advanced"] }),
		published: integer("published", { mode: "boolean" }).notNull().default(true),
		prompt: text("prompt").notNull(),
		imageName: text("image_name")
	}),
	(table) => [
		index("tasks_published_category_idx").on(table.published, table.category),
		index("tasks_topic_idx").on(table.topic),
		index("tasks_difficulty_idx").on(table.difficulty)
	]
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

export const chatMessages = sqliteTable(
	"chat_messages",
	withBaseColumns({
		practiceSessionId: text("practice_session_id")
			.notNull()
			.references(() => practiceSessions.id, { onDelete: "cascade" }),

		from: text("from", { enum: ["assistant", "user"] }).notNull(),
		message: text("message").notNull()
	})
);

export const evaluations = sqliteTable(
	"evaluations",
	withBaseColumns({
		practiceSessionId: text("practice_session_id")
			.notNull()
			.unique()
			.references(() => practiceSessions.id, { onDelete: "cascade" }),

		result: text("result", { mode: "json" }).$type<Evaluation>().notNull()
	})
);

export const adminAuditLogs = sqliteTable(
	"admin_audit_logs",
	withBaseColumns({
		actorUserId: text("actor_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		action: text("action").notNull(),
		targetType: text("target_type").notNull(),
		targetId: text("target_id"),
		metadata: text("metadata", { mode: "json" })
			.$type<Record<string, string | number | boolean | null>>()
			.notNull()
			.default({})
	}),
	(table) => [index("admin_audit_logs_created_idx").on(table.createdAt)]
);

export const aiRequests = sqliteTable(
	"ai_requests",
	withBaseColumns({
		userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
		practiceSessionId: text("practice_session_id").references(() => practiceSessions.id, {
			onDelete: "set null"
		}),
		kind: text("kind", { enum: ["grading", "chat"] }).notNull(),
		status: text("status", { enum: ["pending", "success", "error"] }).notNull(),
		model: text("model").notNull(),
		startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
		completedAt: integer("completed_at", { mode: "timestamp_ms" }),
		durationMs: integer("duration_ms"),
		inputTokens: integer("input_tokens"),
		outputTokens: integer("output_tokens"),
		errorSummary: text("error_summary")
	}),
	(table) => [
		index("ai_requests_created_idx").on(table.createdAt),
		index("ai_requests_user_kind_started_idx").on(table.userId, table.kind, table.startedAt),
		index("ai_requests_session_idx").on(table.practiceSessionId),
		index("ai_requests_started_idx").on(table.startedAt)
	]
);

export const aiSettings = sqliteTable("ai_settings", {
	key: text("key").primaryKey(),
	value: text("value").notNull(),
	updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now)
});

export type ProfileEntity = typeof profiles.$inferSelect;
export type TaskEntity = typeof tasks.$inferSelect;
export type PracticeSessionEntity = typeof practiceSessions.$inferSelect;
export type ChatMessageEntity = typeof chatMessages.$inferSelect;
export type EvaluationEntity = typeof evaluations.$inferSelect;

/******************************************************************************
 *                                                                            *
 *                                RELATIONS                                   *
 *                                                                            *
 *****************************************************************************/
export const profilesRelations = relations(profiles, ({ one }) => ({
	user: one(users, {
		fields: [profiles.id],
		references: [users.id]
	})
}));

export const tasksRelations = relations(tasks, ({ many, one }) => ({
	user: one(users, {
		fields: [tasks.userId],
		references: [users.id]
	}),
	practiceSessions: many(practiceSessions)
}));

export const practiceSessionsRelations = relations(practiceSessions, ({ one, many }) => ({
	task: one(tasks, {
		fields: [practiceSessions.taskId],
		references: [tasks.id]
	}),
	evaluation: one(evaluations),
	chatMessages: many(chatMessages)
}));

export const evaluationsRelations = relations(evaluations, ({ one }) => ({
	practiceSession: one(practiceSessions, {
		fields: [evaluations.practiceSessionId],
		references: [practiceSessions.id]
	})
}));

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
	actor: one(users, {
		fields: [adminAuditLogs.actorUserId],
		references: [users.id]
	})
}));

export const aiRequestsRelations = relations(aiRequests, ({ one }) => ({
	user: one(users, { fields: [aiRequests.userId], references: [users.id] }),
	practiceSession: one(practiceSessions, {
		fields: [aiRequests.practiceSessionId],
		references: [practiceSessions.id]
	})
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
	practiceSession: one(practiceSessions, {
		fields: [chatMessages.practiceSessionId],
		references: [practiceSessions.id]
	})
}));
