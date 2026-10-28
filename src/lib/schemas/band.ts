import z from "zod";

export const bandSchema = z.number().min(0).max(9).multipleOf(0.5);
