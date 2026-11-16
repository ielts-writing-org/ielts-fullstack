import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { isValidSubcategory, taskSubcategorySchema } from "#lib/domain/task-subcategory.ts";
import { AI_CHAT_MODEL_OPTIONS, AI_GRADING_MODEL_OPTIONS } from "#lib/server/ai-settings.ts";
import { recordAdminAction, requireAdmin } from "#lib/server/auth/admin.ts";
import { aiSettings, practiceSessions, tasks } from "#lib/server/db/app.schema.ts";
import { getImagePath } from "#lib/utils/paths.ts";

const userIdSchema = z.object({ userId: z.string().min(1).max(128) });

export const setAdminUserRole = command(
	userIdSchema.extend({ isAdmin: z.boolean() }),
	async ({ userId, isAdmin }) => {
		const event = getRequestEvent();
		const { user, db } = await requireAdmin(event.locals);
		if (userId === user.id) error(400, "You cannot change your own administrator role.");
		const now = Date.now();
		let result;
		if (isAdmin) {
			result = await db.run(sql`
				UPDATE users SET role = 'admin'
				WHERE id = ${userId}
				AND EXISTS (
					SELECT 1 FROM users WHERE id = ${user.id} AND role = 'admin'
					AND (banned = 0 OR banned IS NULL OR ban_expires <= ${now})
				)
			`);
		} else {
			result = await db.run(sql`
				UPDATE users SET role = NULL
				WHERE id = ${userId} AND role = 'admin' AND id <> ${user.id}
				AND (SELECT count(*) FROM users WHERE role = 'admin'
					AND (banned = 0 OR banned IS NULL OR ban_expires <= ${now})) > 1
				AND EXISTS (
					SELECT 1 FROM users WHERE id = ${user.id} AND role = 'admin'
					AND (banned = 0 OR banned IS NULL OR ban_expires <= ${now})
				)
			`);
		}
		if (result.meta.changes !== 1) {
			const target = await db.query.users.findFirst({
				where: (fields, { eq }) => eq(fields.id, userId),
				columns: { role: true }
			});
			if (!target) error(404, "User not found.");
			if (!isAdmin && target.role === "admin") error(409, "The last active administrator cannot be removed.");
			if (isAdmin && target.role === "admin") return { success: true };
			error(409, "Administrator privileges changed; reload and try again.");
		}
		await recordAdminAction(db, user.id, isAdmin ? "user.role.grant" : "user.role.revoke", "user", userId);
		return { success: true };
	}
);

export const setAdminUserLocked = command(
	userIdSchema.extend({ locked: z.boolean(), reason: z.string().trim().max(500).default("") }),
	async ({ userId, locked, reason }) => {
		const event = getRequestEvent();
		const { user, db } = await requireAdmin(event.locals);
		if (userId === user.id) error(400, "You cannot lock your own account.");
		const target = await db.query.users.findFirst({
			where: (fields, { eq }) => eq(fields.id, userId),
			columns: { id: true, role: true, banned: true, banExpires: true }
		});
		if (!target) error(404, "User not found.");
		const now = Date.now();
		const currentlyLocked = Boolean(
			target.banned && (!target.banExpires || target.banExpires.getTime() > now)
		);
		if (currentlyLocked === locked) return { success: true };

		let result;
		if (locked) {
			result = await db.run(sql`
				UPDATE users SET banned = 1, ban_reason = ${reason || "Locked by an administrator."}, ban_expires = NULL
				WHERE id = ${userId} AND id <> ${user.id}
				AND (role IS NULL OR role <> 'admin' OR
					(SELECT count(*) FROM users WHERE role = 'admin'
					 AND (banned = 0 OR banned IS NULL OR ban_expires <= ${now})) > 1)
				AND EXISTS (SELECT 1 FROM users WHERE id = ${user.id} AND role = 'admin'
					AND (banned = 0 OR banned IS NULL OR ban_expires <= ${now}))
			`);
			if (result.meta.changes !== 1) error(409, "Cannot lock the last active administrator.");
			await event.locals.auth.api.revokeUserSessions({
				body: { userId },
				headers: event.request.headers
			});
		} else {
			result = await db.run(sql`
				UPDATE users SET banned = 0, ban_reason = NULL, ban_expires = NULL
				WHERE id = ${userId}
				AND EXISTS (SELECT 1 FROM users WHERE id = ${user.id} AND role = 'admin'
					AND (banned = 0 OR banned IS NULL OR ban_expires <= ${now}))
			`);
			if (result.meta.changes !== 1) error(409, "Administrator privileges changed; reload and try again.");
		}
		await recordAdminAction(db, user.id, locked ? "user.lock" : "user.unlock", "user", userId, {
			reasonProvided: locked && reason.length > 0
		});
		return { success: true };
	}
);

export const revokeAdminUserSessions = command(userIdSchema, async ({ userId }) => {
	const event = getRequestEvent();
	const { user, db } = await requireAdmin(event.locals);
	if (userId === user.id) error(400, "You cannot revoke your own sessions from user management.");
	const target = await db.query.users.findFirst({
		where: (fields, { eq }) => eq(fields.id, userId),
		columns: { id: true }
	});
	if (!target) error(404, "User not found.");
	await event.locals.auth.api.revokeUserSessions({
		body: { userId },
		headers: event.request.headers
	});
	await recordAdminAction(db, user.id, "user.sessions.revoke", "user", userId);
	return { success: true };
});

const adminTaskFields = z.object({
	category: z.enum(["1", "2"]),
	subcategory: z.union([taskSubcategorySchema, z.literal("")]).transform((value) => value || null),
	topic: z.string().trim().max(160).transform((value) => value || null),
	difficulty: z.enum(["beginner", "intermediate", "advanced", ""]).transform((value) => value || null),
	prompt: z.string().trim().min(1).max(20_000),
	published: z.boolean()
});

export const createAdminTask = command(adminTaskFields, async (input) => {
	const { user, db } = await requireAdmin(getRequestEvent().locals);
	if (input.subcategory && !isValidSubcategory(input.category, input.subcategory)) {
		error(400, "The subcategory does not belong to the selected task category.");
	}
	const [created] = await db
		.insert(tasks)
		.values({
			userId: null,
			category: input.category,
			subcategory: input.subcategory,
			topic: input.topic,
			difficulty: input.difficulty,
			prompt: input.prompt,
			// Task 1 cannot be published until its required image has been uploaded.
			published: input.published && input.category === "2"
		})
		.returning({ id: tasks.id });
	const published = input.published && input.category === "2";
	await recordAdminAction(db, user.id, "task.create", "task", created.id, {
		category: input.category,
		published
	});
	return { taskId: created.id, published };
});

export const updateAdminTask = command(
	adminTaskFields.extend({ taskId: z.uuidv7() }),
	async ({ taskId, ...input }) => {
		const { user, db } = await requireAdmin(getRequestEvent().locals);
		if (input.subcategory && !isValidSubcategory(input.category, input.subcategory)) {
			error(400, "The subcategory does not belong to the selected task category.");
		}
		const old = await db.query.tasks.findFirst({ where: (fields, { eq }) => eq(fields.id, taskId) });
		if (!old || old.deletedAt) error(404, "Active task not found.");
		const imageName = input.category === "1" && old.category === "1" ? old.imageName : null;
		const imageAvailable = imageName
			? Boolean(await env.IELTS_WRITING_BUCKET.head(getImagePath(imageName)))
			: false;
		const published = input.published && (input.category === "2" || imageAvailable);
		const [created] = await db
			.insert(tasks)
			.values({
				userId: old.userId,
				category: input.category,
				subcategory: input.subcategory,
				topic: input.topic,
				difficulty: input.difficulty,
				prompt: input.prompt,
				imageName,
				published
			})
			.returning({ id: tasks.id });
		const archived = await db
			.update(tasks)
			.set({ deletedAt: new Date(), published: false })
			.where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)));
		if (archived.meta.changes !== 1) {
			await db.delete(tasks).where(eq(tasks.id, created.id));
			error(409, "Question changed while it was being edited. Reload and retry.");
		}
		await recordAdminAction(db, user.id, "task.update", "task", created.id, {
			previousVersionId: taskId,
			published
		});
		return { taskId: created.id, published, previousVersionArchived: true };
	}
);

export const setAdminTaskVisibility = command(
	z.object({ taskId: z.uuidv7(), published: z.boolean() }),
	async ({ taskId, published }) => {
		const { user, db } = await requireAdmin(getRequestEvent().locals);
		const task = await db.query.tasks.findFirst({
			where: (fields, { eq }) => eq(fields.id, taskId),
			columns: { userId: true, category: true, imageName: true, deletedAt: true }
		});
		if (!task || task.deletedAt) error(404, "Active task not found.");
		if (task.userId !== null) error(400, "Only system tasks have public visibility.");
		if (published && task.category === "1") {
			if (!task.imageName || !(await env.IELTS_WRITING_BUCKET.head(getImagePath(task.imageName)))) {
				error(400, "Task 1 needs an available image before it can be shown.");
			}
		}
		const updated = await db
			.update(tasks)
			.set({ published })
			.where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt), isNull(tasks.userId)));
		if (updated.meta.changes !== 1) {
			error(409, "Question visibility changed. Reload and try again.");
		}
		await recordAdminAction(db, user.id, published ? "task.publish" : "task.hide", "task", taskId);
		return { success: true };
	}
);

export const archiveAdminTask = command(z.object({ taskId: z.uuidv7() }), async ({ taskId }) => {
	const { user, db } = await requireAdmin(getRequestEvent().locals);
	const task = await db.query.tasks.findFirst({
		where: (fields, { eq }) => eq(fields.id, taskId),
		columns: { id: true, deletedAt: true }
	});
	if (!task) error(404, "Task not found.");
	if (task.deletedAt) return { success: true };
	const archived = await db
		.update(tasks)
		.set({ published: false, deletedAt: new Date() })
		.where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)));
	if (archived.meta.changes !== 1) error(409, "Question changed. Reload and try again.");
	await recordAdminAction(db, user.id, "task.archive", "task", taskId);
	return { success: true };
});

export const removeAdminTaskImage = command(z.object({ taskId: z.uuidv7() }), async ({ taskId }) => {
	const { user, db } = await requireAdmin(getRequestEvent().locals);
	const old = await db.query.tasks.findFirst({ where: (fields, { eq }) => eq(fields.id, taskId) });
	if (!old || old.deletedAt) error(404, "Active task not found.");
	if (!old.imageName) return { taskId, success: true };
	const [created] = await db
		.insert(tasks)
		.values({
			userId: old.userId,
			category: old.category,
			subcategory: old.subcategory,
			topic: old.topic,
			difficulty: old.difficulty,
			prompt: old.prompt,
			imageName: null,
			published: false
		})
		.returning({ id: tasks.id });
	const archived = await db
		.update(tasks)
		.set({ published: false, deletedAt: new Date() })
		.where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)));
	if (archived.meta.changes !== 1) {
		await db.delete(tasks).where(eq(tasks.id, created.id));
		error(409, "Question changed while its image was being removed. Reload and retry.");
	}
	await recordAdminAction(db, user.id, "task.image.remove", "task", created.id, {
		previousVersionId: taskId
	});
	return { taskId: created.id, success: true };
});

export const restoreAdminTask = command(z.object({ taskId: z.uuidv7() }), async ({ taskId }) => {
	const { user, db } = await requireAdmin(getRequestEvent().locals);
	const task = await db.query.tasks.findFirst({
		where: (fields, { eq }) => eq(fields.id, taskId),
		columns: { userId: true, deletedAt: true }
	});
	if (!task) error(404, "Task not found.");
	if (!task.deletedAt) return { success: true };
	const restored = await db
		.update(tasks)
		.set({ deletedAt: null, ...(task.userId === null ? { published: false } : {}) })
		.where(and(eq(tasks.id, taskId), sql`${tasks.deletedAt} IS NOT NULL`));
	if (restored.meta.changes !== 1) {
		const latest = await db.query.tasks.findFirst({
			where: (fields, { eq }) => eq(fields.id, taskId),
			columns: { deletedAt: true }
		});
		if (!latest) error(404, "Task not found.");
		if (!latest.deletedAt) return { success: true };
		error(409, "Question changed. Reload and try again.");
	}
	await recordAdminAction(db, user.id, "task.restore", "task", taskId);
	return { success: true };
});

export const deleteAdminSession = command(
	z.object({ practiceSessionId: z.uuidv7() }),
	async ({ practiceSessionId }) => {
		const { user, db } = await requireAdmin(getRequestEvent().locals);
		const target = await db.query.practiceSessions.findFirst({
			where: (fields, { eq }) => eq(fields.id, practiceSessionId),
			columns: { id: true }
		});
		if (!target) error(404, "Practice session not found.");
		// The session FK uses ON DELETE CASCADE for evaluations and chats; one D1
		// statement keeps the dependent cleanup atomic without db.transaction().
		await db.delete(practiceSessions).where(eq(practiceSessions.id, practiceSessionId));
		await recordAdminAction(db, user.id, "practice_session.delete", "practice_session", practiceSessionId);
		return { success: true };
	}
);

const aiConfigSchema = z.object({
	chatModel: z.enum(AI_CHAT_MODEL_OPTIONS),
	gradingModel: z.enum(AI_GRADING_MODEL_OPTIONS),
	enableThinking: z.boolean(),
	maxOutputTokens: z.number().int().min(128).max(8192),
	seed: z.number().int().min(0).max(2_147_483_647),
	temperature: z.number().min(0).max(2),
	chatDailyLimit: z.number().int().min(0).max(1000),
	gradingDailyLimit: z.number().int().min(0).max(500)
});

export const saveAdminAiConfig = command(aiConfigSchema, async (input) => {
	const { user, db } = await requireAdmin(getRequestEvent().locals);
	const rows = Object.entries(input).map(([key, value]) => ({
		key,
		value: String(value),
		updatedBy: user.id
	}));
	await db.insert(aiSettings).values(rows).onConflictDoUpdate({
		target: aiSettings.key,
		set: { value: sql`excluded.value`, updatedBy: user.id, updatedAt: new Date() }
	});
	await recordAdminAction(db, user.id, "ai.config.update", "ai_config", null, {
		chatModel: input.chatModel,
		gradingModel: input.gradingModel,
		enableThinking: input.enableThinking,
		maxOutputTokens: input.maxOutputTokens,
		seed: input.seed,
		temperature: input.temperature,
		chatDailyLimit: input.chatDailyLimit,
		gradingDailyLimit: input.gradingDailyLimit
	});
	return { success: true };
});

export const saveAdminPrompt = command(
	z.object({
		key: z.enum([
			"chat-prompt-1",
			"chat-prompt-2",
			"evaluation-prompt-1",
			"evaluation-prompt-2"
		]),
		prompt: z.string().min(1).max(30_000).refine((value) => value.trim().length > 0)
	}),
	async ({ key, prompt }) => {
		const { user, db } = await requireAdmin(getRequestEvent().locals);
		await env.IELTS_WRITING_KV.put(key, prompt);
		await recordAdminAction(db, user.id, "ai.prompt.update", "cloudflare_kv", key, {
			storage: "IELTS_WRITING_KV",
			characters: prompt.length
		});
		return { success: true };
	}
);
