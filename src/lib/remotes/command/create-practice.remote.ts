import { resolve } from "$app/paths";
import { command, getRequestEvent } from "$app/server";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { taskCategorySchema } from "#lib/domain/task-category.ts";
import { practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import { practiceTypeSchema } from "#lib/domain/practice-type.ts";
import { error } from "@sveltejs/kit";

export const createPractice = command(
	z.object({
		taskCategory: taskCategorySchema,
		taskId: z.uuidv7().optional(),
		practiceSessionType: practiceTypeSchema
	}),
	async ({ taskCategory, taskId, practiceSessionType: practiceType }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		if (!taskId) {
			const [createdTask] = await db
				.insert(tasks)
				.values({
					category: taskCategory,
					prompt: "",
					userId: user.id
				})
				.returning({ id: tasks.id });

			taskId = createdTask.id;
		} else {
			const task = await db.query.tasks.findFirst({
				where: (fields, { and, eq, isNull, or }) =>
					and(
						eq(fields.id, taskId!),
						isNull(fields.deletedAt),
						or(
							eq(fields.userId, user.id),
							and(isNull(fields.userId), eq(fields.published, true))
						)
					),
				columns: { category: true }
			});
			if (!task) error(404, "Task does not exist.");
			if (task.category !== taskCategory) error(400, "Task category does not match the selected task.");
		}

		const [createdPracticeSession] = await db
			.insert(practiceSessions)
			.values({
				name: "Draft",
				response: "",
				taskId: taskId,
				type: practiceType,
				userId: user.id
			})
			.returning({ id: practiceSessions.id });

		return {
			location: resolve("/(protected)/practice/[practiceSessionId=practiceSessionId]", {
				practiceSessionId: createdPracticeSession.id
			}),
			success: true
		};
	}
);
