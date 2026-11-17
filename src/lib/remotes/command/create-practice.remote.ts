import { resolve } from "$app/paths";
import { command, getRequestEvent } from "$app/server";
import { z } from "zod";
import { taskCategorySchema } from "#lib/domain/task-category.ts";
import { practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import { practiceTypeSchema } from "#lib/domain/practice-type.ts";
import { error } from "@sveltejs/kit";

export const createPractice = command(
	z.object({
		taskCategory: taskCategorySchema,
		taskId: z.uuidv7().optional(),
		practiceSessionType: practiceTypeSchema
	}),
	async ({ taskCategory, taskId, practiceSessionType }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDatabase();
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
				where: {
					id: taskId,
					deletedAt: { isNull: true },
					OR: [{ userId: user.id }, { userId: { isNull: true }, published: true }]
				},
				columns: { category: true }
			});
			if (!task) error(404);
			if (task.category !== taskCategory) error(400);
		}

		const [createdPracticeSession] = await db
			.insert(practiceSessions)
			.values({
				name: "Draft",
				response: "",
				taskId: taskId,
				type: practiceSessionType,
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
