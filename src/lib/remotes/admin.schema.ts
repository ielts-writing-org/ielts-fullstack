import { z } from "zod";

export const adminPagingSchema = z.object({
	page: z.number().int().min(1).max(100_000),
	pageSize: z.number().int().min(1).max(100)
});

export const adminSearchSchema = z.string().trim().max(200).default("");

export const adminUserIdSchema = z.object({ userId: z.string().min(1).max(128) });
