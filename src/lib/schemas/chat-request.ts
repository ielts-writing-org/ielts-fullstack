import { z } from "zod";
import { chatMessageSchema } from "./chat-message";
import { evaluationSchema } from "./evaluation";
import { taskCategorySchema } from "./task-category";

export const chatRequestSchema = z.object({
	task: z.object({
		category: taskCategorySchema,
		prompt: z.string().optional(),
		imageName: z.string().optional()
	}),
	practiceSession: z.object({
		response: z.string().optional()
	}),
	messages: chatMessageSchema.array().min(1),
	evaluation: evaluationSchema.optional()
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
