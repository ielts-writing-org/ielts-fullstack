import { resolve } from "$app/paths";
import { command, getRequestEvent } from "$app/server";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { taskCategorySchema } from "#lib/schemas/task-category.ts";
import { requireSessionApi } from "#lib/server/auth.ts";
import { practiceSession, task } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";

export const createPractice = command(
	z.object({
		taskCategory: taskCategorySchema,
		taskId: z.uuidv7().optional(),
		practiceSessionType: z.enum(["timed", "free"])
	}),
	async ({ taskCategory, taskId, practiceSessionType: practiceType }) => {
		const { locals } = getRequestEvent();

		const { user } = requireSessionApi(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		if (!taskId) {
			const [createdTask] = await db
				.insert(task)
				.values({
					category: taskCategory,
					prompt: "",
					userId: user.id
				})
				.returning({ id: task.id });

			taskId = createdTask.id;
		}

		const [createdPracticeSession] = await db
			.insert(practiceSession)
			.values({
				name: "Draft",
				response: "",
				taskId: taskId,
				type: practiceType,
				userId: user.id
			})
			.returning({ id: practiceSession.id });

		return {
			location: resolve("/(protected)/practice/[practiceSessionId=practiceSessionId]", {
				practiceSessionId: createdPracticeSession.id
			}),
			status: 303,
			success: true
		};
	}
);
