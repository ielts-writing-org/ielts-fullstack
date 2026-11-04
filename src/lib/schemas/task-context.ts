import { z } from "zod";
import { taskCategorySchema } from "#lib/domain/task-category.ts";

export const practiceSessionContextSchema = z.object({
	category: taskCategorySchema,
	image: z.instanceof(File).optional(),
	imageName: z.string().optional(),
	prompt: z.string(),
	response: z.string()
});

export type PracticeSessionContext = z.infer<typeof practiceSessionContextSchema>;
