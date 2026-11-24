import { z } from "zod";
import { AI_CHAT_MODEL_OPTIONS, AI_GRADING_MODEL_OPTIONS } from "#lib/domain/ai-config.ts";
import { adminPagingSchema } from "./admin.schema.ts";

export const getAdminAiRequestsInput = adminPagingSchema.extend({
	kind: z.enum(["all", "grading", "chat"]),
	status: z.enum(["all", "pending", "success", "error"]),
	model: z.string().trim().max(120).default(""),
	days: z.enum(["7", "30", "90", "365"])
});

export const saveAdminAiConfigInput = z.object({
	chatModel: z.enum(AI_CHAT_MODEL_OPTIONS),
	gradingModel: z.enum(AI_GRADING_MODEL_OPTIONS),
	enableThinking: z.boolean(),
	maxOutputTokens: z.number().int().min(128).max(8192),
	seed: z.number().int().min(0).max(2_147_483_647),
	temperature: z.number().min(0).max(2),
	chatDailyLimit: z.number().int().min(0).max(1000),
	gradingDailyLimit: z.number().int().min(0).max(500)
});

export const saveAdminPromptInput = z.object({
	key: z.enum(["chat-prompt-1", "chat-prompt-2", "evaluation-prompt-1", "evaluation-prompt-2"]),
	prompt: z
		.string()
		.min(1)
		.max(30_000)
		.refine((value) => value.trim().length > 0)
});
