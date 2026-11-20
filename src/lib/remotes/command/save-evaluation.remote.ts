import { evaluationSchema } from "#lib/domain/evaluation.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import { evaluations } from "#lib/server/db/app.schema.ts";
import { getDatabase } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";

export const saveEvaluation = command(
	z.object({
		practiceSessionId: z.uuidv7(),
		evaluation: evaluationSchema
	}),
	async ({ practiceSessionId, evaluation }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDatabase();
		const practiceSession = await db.query.practiceSessions.findFirst({
			where: {
				id: practiceSessionId,
				userId: user.id
			},
			columns: { id: true }
		});

		if (!practiceSession) {
			error(404, "Practice Session does not exist.");
		}

		await db
			.insert(evaluations)
			.values({ practiceSessionId, result: evaluation })
			.onConflictDoUpdate({
				target: evaluations.practiceSessionId,
				set: { result: evaluation }
			});

		return { success: true };
	}
);
