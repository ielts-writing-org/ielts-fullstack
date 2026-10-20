import { z } from "zod";
import { taskCategorySchema } from "./task-category";

export const practiceSessionContextSchema = z.object({
	category: taskCategorySchema,
	image: z.instanceof(File).optional(),
	prompt: z.string(),
	response: z.string()
});

export type PracticeSessionContext = z.infer<typeof practiceSessionContextSchema>;
