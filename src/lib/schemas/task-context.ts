import { z } from "zod";
import { taskCategorySchema } from "./task-category";

export const taskContextSchema = z.object({
	category: taskCategorySchema,
	image: z.instanceof(File).optional(),
	prompt: z.string(),
	response: z.string()
});

export type TaskContext = z.infer<typeof taskContextSchema>;
