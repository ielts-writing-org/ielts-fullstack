import { z } from "zod";
import { adminPagingSchema, adminSearchSchema, adminUserIdSchema } from "./admin.schema.ts";

export const getAdminUsersInput = adminPagingSchema.extend({
	search: adminSearchSchema,
	role: z.enum(["all", "admin", "user"]),
	status: z.enum(["all", "active", "locked"])
});

export const setAdminUserRoleInput = adminUserIdSchema.extend({ isAdmin: z.boolean() });

export const setAdminUserLockedInput = adminUserIdSchema.extend({
	locked: z.boolean(),
	reason: z.string().trim().max(500).default("")
});
