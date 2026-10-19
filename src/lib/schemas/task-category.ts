import { z } from "zod";

export const taskCategorySchema = z.enum(["1", "2"]);

export type TaskCategory = z.infer<typeof taskCategorySchema>;
