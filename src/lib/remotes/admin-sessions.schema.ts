import { z } from "zod";
import { adminPagingSchema, adminSearchSchema } from "./admin.schema.ts";

export const getAdminSessionsInput = adminPagingSchema.extend({
	search: adminSearchSchema,
	category: z.enum(["all", "1", "2"]),
	type: z.enum(["all", "free", "timed"]),
	evaluation: z.enum(["all", "evaluated", "unevaluated"]),
	days: z.enum(["all", "7", "30", "90"])
});

export const adminSessionIdInput = z.object({ practiceSessionId: z.uuidv7() });
