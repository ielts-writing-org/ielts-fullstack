import z from "zod";

export const PRACTICE_TYPES = ["free", "timed"] as const;
export type PracticeType = (typeof PRACTICE_TYPES)[number];

export const practiceTypeSchema = z.enum(PRACTICE_TYPES, "Practice type must be free or timed.");
