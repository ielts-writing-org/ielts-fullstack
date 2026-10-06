import { z } from "zod";

export const taskIdSchema = z.enum(["1", "2"]);

export type TaskId = z.infer<typeof taskIdSchema>;

export function isValidTaskId(id: string): id is TaskId {
	return typeof id === "string" && taskIdSchema.safeParse(id).success;
}
