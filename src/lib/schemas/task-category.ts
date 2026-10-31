import { z } from "zod";

export const taskCategorySchema = z.enum(["1", "2"], "Task category must be 1 or 2.");

export type TaskCategory = z.infer<typeof taskCategorySchema>;
