import { evaluationSchema } from "#lib/schemas/evaluation.ts";
import { getApiSession } from "#lib/server/auth/index.ts";
import { evaluations } from "#lib/server/db/app.schema.ts";
import { getDb } from "#lib/server/db/index.ts";
import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { z } from "zod";

export const saveEvaluation = command(
	z.object({
		practiceSessionId: z.uuidv7(),
		evaluation: evaluationSchema
	}),
	async ({ practiceSessionId, evaluation }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const db = getDb(env.IELTS_WRITING_DB);
		const practiceSession = await db.query.practiceSessions.findFirst({
			where: (practiceSessions, { and, eq }) =>
				and(eq(practiceSessions.id, practiceSessionId), eq(practiceSessions.userId, user.id)),
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
