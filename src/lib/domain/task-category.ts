import z from "zod";

export const TASK_CATEGORIES = ["1", "2"] as const;
export const taskCategorySchema = z.enum(TASK_CATEGORIES, "Task category must be 1 or 2.");
export type TaskCategory = z.infer<typeof taskCategorySchema>;
