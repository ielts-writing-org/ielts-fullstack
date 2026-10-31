import z from "zod";

export const practiceSessionTypeSchema = z.enum(["timed", "free"]);

export type PracticeSessionType = z.infer<typeof practiceSessionTypeSchema>;
