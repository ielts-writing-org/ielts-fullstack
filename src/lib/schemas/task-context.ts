import { z } from "zod";

export const baseTaskContextSchema = z.object({
	prompt: z.string(),
	response: z.string()
});

export const taskContext1Schema = baseTaskContextSchema.extend({
	id: z.literal("1"),
	image: z.instanceof(File).optional()
});

export const taskContext2Schema = baseTaskContextSchema.extend({
	id: z.literal("2")
});

export const taskContextSchema = z.discriminatedUnion("id", [
	taskContext1Schema,
	taskContext2Schema
]);

export type TaskContext1 = z.infer<typeof taskContext1Schema>;
export type TaskContext2 = z.infer<typeof taskContext2Schema>;
export type TaskContext = z.infer<typeof taskContextSchema>;
