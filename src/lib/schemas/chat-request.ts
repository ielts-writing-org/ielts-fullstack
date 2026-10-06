import { z } from "zod";
import { chatMessageSchema } from "./chat-message";
import { evaluationSchema } from "./evaluation";
import { taskContextSchema } from "./task-context";

export const chatRequestSchema = z.object({
	taskContext: taskContextSchema,
	evaluation: evaluationSchema.optional(),
	messages: chatMessageSchema.array().min(1)
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
