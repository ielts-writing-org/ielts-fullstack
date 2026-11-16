import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { getDb } from "#lib/server/db/index.ts";
import type { AiRuntimeConfig } from "#lib/server/ai-settings.ts";

export type AiRequestKind = "grading" | "chat";

/** One INSERT..SELECT both checks the daily cap and reserves the attempt atomically. */
export async function reserveAiRequest(
	userId: string,
	practiceSessionId: string,
	kind: AiRequestKind,
	model: string,
	runtime: AiRuntimeConfig
) {
	const startedAt = Date.now();
	const dayStart = new Date();
	dayStart.setUTCHours(0, 0, 0, 0);
	const limit = kind === "chat" ? runtime.chatDailyLimit : runtime.gradingDailyLimit;
	const id = uuidv7();
	const db = getDb(env.IELTS_WRITING_DB);
	const result = await db.run(sql`
		INSERT INTO ai_requests (id, user_id, practice_session_id, kind, status, model, started_at, created_at, updated_at)
		SELECT ${id}, ${userId}, ${practiceSessionId}, ${kind}, 'pending', ${model}, ${startedAt}, ${startedAt}, ${startedAt}
		WHERE ${limit} = 0 OR (
			SELECT count(*) FROM ai_requests
			WHERE user_id = ${userId} AND kind = ${kind} AND started_at >= ${dayStart.getTime()}
		) < ${limit}
	`);
	if (result.meta.changes !== 1) error(429, `Daily ${kind} quota reached. Resets at 00:00 UTC.`);
	return { id, startedAt };
}

export function trackAiStream(
	stream: ReadableStream<Uint8Array>,
	requestId: string,
	startedAt: number
): ReadableStream<Uint8Array> {
	const reader = stream.getReader();
	let finished = false;
	let partial = "";
	const decoder = new TextDecoder();
	let inputTokens: number | null = null;
	let outputTokens: number | null = null;
	let providerError = false;
	const inspect = (chunk: string) => {
		partial += chunk;
		const lines = partial.split("\n");
		partial = lines.pop() ?? "";
		for (const line of lines) {
			if (!line.startsWith("data:")) continue;
			try {
				const frame: unknown = JSON.parse(line.slice(5).trim());
				if (!frame || typeof frame !== "object") continue;
				if ("error" in frame && frame.error) providerError = true;
				if (!("usage" in frame) || !frame.usage || typeof frame.usage !== "object") continue;
				const usage = frame.usage as Record<string, unknown>;
				const input = usage.input_tokens ?? usage.prompt_tokens;
				const output = usage.output_tokens ?? usage.completion_tokens;
				if (typeof input === "number" && Number.isFinite(input)) inputTokens = input;
				if (typeof output === "number" && Number.isFinite(output)) outputTokens = output;
			} catch {
				// Ignore incomplete or non-JSON SSE frames; the original bytes pass through unchanged.
			}
		}
	};
	const finish = async (status: "success" | "error", summary: string | null) => {
		if (finished) return;
		finished = true;
		try {
			await getDb(env.IELTS_WRITING_DB).run(sql`
				UPDATE ai_requests SET status = ${status}, completed_at = ${Date.now()},
					duration_ms = ${Date.now() - startedAt}, input_tokens = ${inputTokens}, output_tokens = ${outputTokens},
					error_summary = ${summary}, updated_at = ${Date.now()}
				WHERE id = ${requestId}
			`);
		} catch (cause) {
			console.error("AI telemetry update failed", cause instanceof Error ? cause.name : "unknown");
		}
	};

	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			try {
				const next = await reader.read();
				if (next.done) {
					inspect(decoder.decode());
					if (partial.startsWith("data:")) inspect("\n");
					await finish(providerError ? "error" : "success", providerError ? "AI provider reported a stream error" : null);
					controller.close();
				} else {
					inspect(decoder.decode(next.value, { stream: true }));
					controller.enqueue(next.value);
				}
			} catch {
				await finish("error", "AI provider stream failed");
				controller.error(new Error("AI stream failed."));
			}
		},
		async cancel(reason) {
			try {
				await reader.cancel(reason);
			} finally {
				await finish("error", "Client cancelled stream");
			}
		}
	});
}

export async function failAiRequest(requestId: string, startedAt: number, summary: string) {
	try {
		await getDb(env.IELTS_WRITING_DB).run(sql`
			UPDATE ai_requests SET status = 'error', completed_at = ${Date.now()},
				duration_ms = ${Date.now() - startedAt}, error_summary = ${summary.slice(0, 240)}, updated_at = ${Date.now()}
			WHERE id = ${requestId}
		`);
	} catch (cause) {
		console.error("AI telemetry update failed", cause instanceof Error ? cause.name : "unknown");
	}
}
