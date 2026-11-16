import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";
import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	isNull,
	isNotNull,
	like,
	ne,
	or,
	sql
} from "drizzle-orm";
import { getRequestEvent, query } from "$app/server";
import { z } from "zod";
import { requireAdmin } from "#lib/server/auth/admin.ts";
import {
	getStoredAiSettings,
	DEFAULT_AI_RUNTIME,
	AI_CHAT_MODEL_OPTIONS,
	AI_GRADING_MODEL_OPTIONS
} from "#lib/server/ai-settings.ts";
import {
	aiRequests,
	adminAuditLogs,
	evaluations,
	practiceSessions,
	tasks
} from "#lib/server/db/app.schema.ts";
import { users } from "#lib/server/db/auth.schema.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";

const pagingSchema = z.object({
	page: z.number().int().min(1).max(100_000),
	pageSize: z.number().int().min(1).max(100)
});

const searchSchema = z.string().trim().max(200).default("");

export const getAdminUsers = query(
	pagingSchema.extend({
		search: searchSchema,
		role: z.enum(["all", "admin", "user"]),
		status: z.enum(["all", "active", "locked"])
	}),
	async ({ page, pageSize, search, role, status }) => {
		const { db, user: adminUser } = await requireAdmin(getRequestEvent().locals);
		const now = Date.now();
		const locked = sql`(${users.banned} = 1 AND (${users.banExpires} IS NULL OR ${users.banExpires} > ${now}))`;
		const active = sql`(${users.banned} IS NULL OR ${users.banned} = 0 OR ${users.banExpires} <= ${now})`;
		const conditions = [];
		if (search) {
			const pattern = `%${search}%`;
			conditions.push(or(like(users.name, pattern), like(users.email, pattern))!);
		}
		if (role === "admin") conditions.push(eq(users.role, "admin"));
		if (role === "user") conditions.push(or(isNull(users.role), ne(users.role, "admin"))!);
		if (status === "locked") conditions.push(locked);
		if (status === "active") conditions.push(active);
		const where = conditions.length ? and(...conditions) : undefined;
		const [totalRow] = await db.select({ total: count() }).from(users).where(where);
		const rows = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				image: users.image,
				role: users.role,
				banned: users.banned,
				banExpires: users.banExpires,
				createdAt: users.createdAt,
				lastActiveAt: users.lastActiveAt
			})
			.from(users)
			.where(where)
			.orderBy(asc(users.name), asc(users.email))
			.limit(pageSize)
			.offset((page - 1) * pageSize);
		return {
			users: rows.map((row) => ({
				...row,
				locked: Boolean(row.banned && (!row.banExpires || row.banExpires.getTime() > now))
			})),
			page,
			pageSize,
			total: totalRow?.total ?? 0,
			currentAdminId: adminUser.id
		};
	}
);

export const getAdminTasks = query(
	pagingSchema.extend({
		search: searchSchema,
		category: z.enum(["all", "1", "2"]),
		source: z.enum(["all", "system", "personal"]),
		visibility: z.enum(["all", "shown", "hidden"]),
		status: z.enum(["active", "archived"])
	}),
	async ({ page, pageSize, search, category, source, visibility, status }) => {
		const { db } = await requireAdmin(getRequestEvent().locals);
		const conditions = [];
		if (category !== "all") conditions.push(eq(tasks.category, category));
		if (source === "system") conditions.push(isNull(tasks.userId));
		if (source === "personal") conditions.push(sql`${tasks.userId} IS NOT NULL`);
		if (visibility === "shown") conditions.push(eq(tasks.published, true));
		if (visibility === "hidden") conditions.push(eq(tasks.published, false));
		if (status === "active") conditions.push(isNull(tasks.deletedAt));
		if (status === "archived") conditions.push(sql`${tasks.deletedAt} IS NOT NULL`);
		if (search) {
			const pattern = `%${search}%`;
			conditions.push(
				or(like(tasks.prompt, pattern), like(tasks.topic, pattern), like(tasks.subcategory, pattern))!
			);
		}
		const where = conditions.length ? and(...conditions) : undefined;
		const [totalRow] = await db.select({ total: count() }).from(tasks).where(where);
		const rows = await db
			.select({
				id: tasks.id,
				userId: tasks.userId,
				ownerName: users.name,
				category: tasks.category,
				subcategory: tasks.subcategory,
				topic: tasks.topic,
				difficulty: tasks.difficulty,
				published: tasks.published,
				prompt: tasks.prompt,
				image: tasks.imageName,
				createdAt: tasks.createdAt,
				updatedAt: tasks.updatedAt,
				deletedAt: tasks.deletedAt
			})
			.from(tasks)
			.leftJoin(users, eq(tasks.userId, users.id))
			.where(where)
			.orderBy(desc(tasks.updatedAt))
			.limit(pageSize)
			.offset((page - 1) * pageSize);
		return { tasks: rows, page, pageSize, total: totalRow?.total ?? 0 };
	}
);

export const getAdminSessions = query(
	pagingSchema.extend({
		search: searchSchema,
		category: z.enum(["all", "1", "2"]),
		type: z.enum(["all", "free", "timed"]),
		evaluation: z.enum(["all", "evaluated", "unevaluated"]),
		days: z.enum(["all", "7", "30", "90"])
	}),
	async ({ page, pageSize, search, category, type, evaluation, days }) => {
		const { db } = await requireAdmin(getRequestEvent().locals);
		const conditions = [isNull(practiceSessions.deletedAt)];
		if (category !== "all") conditions.push(eq(tasks.category, category));
		if (type !== "all") conditions.push(eq(practiceSessions.type, type));
		if (evaluation === "evaluated") conditions.push(sql`${evaluations.id} IS NOT NULL`);
		if (evaluation === "unevaluated") conditions.push(isNull(evaluations.id));
		if (days !== "all") {
			conditions.push(gte(practiceSessions.startedAt, new Date(Date.now() - Number(days) * 86_400_000)));
		}
		if (search) {
			const pattern = `%${search}%`;
			conditions.push(
				or(
					like(practiceSessions.name, pattern),
					like(users.name, pattern),
					like(users.email, pattern),
					like(tasks.prompt, pattern)
				)!
			);
		}
		const where = conditions.length ? and(...conditions) : undefined;
		const base = db
			.select({ total: count() })
			.from(practiceSessions)
			.innerJoin(users, eq(practiceSessions.userId, users.id))
			.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
			.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id));
		const [totalRow] = where ? await base.where(where) : await base;
		const rows = await db
			.select({
				id: practiceSessions.id,
				name: practiceSessions.name,
				type: practiceSessions.type,
				startedAt: practiceSessions.startedAt,
				updatedAt: practiceSessions.updatedAt,
				category: tasks.category,
				prompt: tasks.prompt,
				ownerId: users.id,
				ownerName: users.name,
				ownerEmail: users.email,
				evaluated: sql<boolean>`${evaluations.id} IS NOT NULL`,
				band: sql<number | null>`json_extract(${evaluations.result}, '$.estimatedBand')`
			})
			.from(practiceSessions)
			.innerJoin(users, eq(practiceSessions.userId, users.id))
			.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
			.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
			.where(where)
			.orderBy(sql`${practiceSessions.startedAt} DESC`)
			.limit(pageSize)
			.offset((page - 1) * pageSize);
		return { sessions: rows, page, pageSize, total: totalRow?.total ?? 0 };
	}
);

export const getAdminSessionDetail = query(z.uuidv7(), async (practiceSessionId) => {
	const { db } = await requireAdmin(getRequestEvent().locals);
	const session = await db
		.select({
			id: practiceSessions.id,
			taskId: practiceSessions.taskId,
			name: practiceSessions.name,
			type: practiceSessions.type,
			response: practiceSessions.response,
			startedAt: practiceSessions.startedAt,
			updatedAt: practiceSessions.updatedAt,
			category: tasks.category,
			subcategory: tasks.subcategory,
			prompt: tasks.prompt,
			image: tasks.imageName,
			ownerId: users.id,
			ownerName: users.name,
			ownerEmail: users.email,
			evaluation: evaluations.result
		})
		.from(practiceSessions)
		.innerJoin(users, eq(practiceSessions.userId, users.id))
		.innerJoin(tasks, eq(practiceSessions.taskId, tasks.id))
		.leftJoin(evaluations, eq(evaluations.practiceSessionId, practiceSessions.id))
		.where(eq(practiceSessions.id, practiceSessionId))
		.limit(1);
	if (!session[0]) error(404, "Practice session not found.");
	const messages = await db.query.chatMessages.findMany({
		where: (fields, { eq }) => eq(fields.practiceSessionId, practiceSessionId),
		orderBy: (fields, { asc }) => asc(fields.createdAt)
	});
	return { ...session[0], wordCount: computeDeterministicStats(session[0].response).words, messages };
});

export const getAdminAiRequests = query(
	pagingSchema.extend({
		kind: z.enum(["all", "grading", "chat"]),
		status: z.enum(["all", "pending", "success", "error"]),
		model: z.string().trim().max(120).default(""),
		days: z.enum(["7", "30", "90", "365"])
	}),
	async ({ page, pageSize, kind, status, model, days }) => {
		const { db } = await requireAdmin(getRequestEvent().locals);
		const conditions = [gte(aiRequests.startedAt, new Date(Date.now() - Number(days) * 86_400_000))];
		if (kind !== "all") conditions.push(eq(aiRequests.kind, kind));
		if (status !== "all") conditions.push(eq(aiRequests.status, status));
		if (model) conditions.push(eq(aiRequests.model, model));
		const where = and(...conditions);
		const [totalRow] = await db.select({ total: count() }).from(aiRequests).where(where);
		const rows = await db
			.select({
				id: aiRequests.id,
				kind: aiRequests.kind,
				status: aiRequests.status,
				model: aiRequests.model,
				startedAt: aiRequests.startedAt,
				durationMs: aiRequests.durationMs,
				inputTokens: aiRequests.inputTokens,
				outputTokens: aiRequests.outputTokens,
				errorSummary: aiRequests.errorSummary,
				userName: users.name,
				userEmail: users.email,
				practiceSessionId: aiRequests.practiceSessionId
			})
			.from(aiRequests)
			.leftJoin(users, eq(aiRequests.userId, users.id))
			.where(where)
			.orderBy(sql`${aiRequests.startedAt} DESC`)
			.limit(pageSize)
			.offset((page - 1) * pageSize);
		return { requests: rows, page, pageSize, total: totalRow?.total ?? 0 };
	}
);

export const getAdminAiConfig = query(async () => {
	await requireAdmin(getRequestEvent().locals);
	const promptKeys = ["chat-prompt-1", "chat-prompt-2", "evaluation-prompt-1", "evaluation-prompt-2"] as const;
	const stored = await getStoredAiSettings([...promptKeys, ...Object.keys(DEFAULT_AI_RUNTIME)]);
	const prompts: Record<(typeof promptKeys)[number], string> = {
		"chat-prompt-1": "",
		"chat-prompt-2": "",
		"evaluation-prompt-1": "",
		"evaluation-prompt-2": ""
	};
	const promptSources: Record<
		(typeof promptKeys)[number],
		"Cloudflare KV" | "Legacy D1 fallback" | "Not configured"
	> = {
		"chat-prompt-1": "Not configured",
		"chat-prompt-2": "Not configured",
		"evaluation-prompt-1": "Not configured",
		"evaluation-prompt-2": "Not configured"
	};
	for (const key of promptKeys) {
		const kvPrompt = await env.IELTS_WRITING_KV.get(key);
		if (kvPrompt !== null) {
			prompts[key] = kvPrompt;
			promptSources[key] = "Cloudflare KV";
			continue;
		}
		const legacyOverride = stored.get(key);
		prompts[key] = legacyOverride?.trim() ? legacyOverride : "";
		promptSources[key] = legacyOverride?.trim() ? "Legacy D1 fallback" : "Not configured";
	}
	return {
		prompts,
		promptSources,
		settings: Object.fromEntries(stored),
		defaults: DEFAULT_AI_RUNTIME,
		chatModels: AI_CHAT_MODEL_OPTIONS,
		gradingModels: AI_GRADING_MODEL_OPTIONS
	};
});

export const getAdminDashboard = query(z.enum(["7", "30", "90", "365"]), async (days) => {
	const { db } = await requireAdmin(getRequestEvent().locals);
	const from = new Date(Date.now() - Number(days) * 86_400_000);
	const [[totalUsers], [activeUsers], [sessionsCount], [evaluatedWritings], [aiSummary]] =
		await Promise.all([
			db.select({ totalUsers: count() }).from(users),
			db
				.select({ activeUsers: sql<number>`count(distinct ${practiceSessions.userId})` })
				.from(practiceSessions)
				.where(and(isNull(practiceSessions.deletedAt), gte(practiceSessions.updatedAt, from))),
			db
				.select({ sessionsCount: count() })
				.from(practiceSessions)
				.where(and(isNull(practiceSessions.deletedAt), gte(practiceSessions.startedAt, from))),
			db
				.select({ evaluatedWritings: count() })
				.from(evaluations)
				.where(and(isNull(evaluations.deletedAt), gte(evaluations.createdAt, from))),
			db
				.select({
					total: count(),
					requestsError: sql<number>`coalesce(sum(case when ${aiRequests.status} = 'error' then 1 else 0 end), 0)`,
					requestsSuccess: sql<number>`coalesce(sum(case when ${aiRequests.status} = 'success' then 1 else 0 end), 0)`,
					averageLatencyMs: sql<number | null>`avg(${aiRequests.durationMs})`,
					inputTokens: sql<number>`coalesce(sum(${aiRequests.inputTokens}), 0)`,
					outputTokens: sql<number>`coalesce(sum(${aiRequests.outputTokens}), 0)`
				})
				.from(aiRequests)
				.where(gte(aiRequests.startedAt, from))
		]);
	const byKind = await db
		.select({ kind: aiRequests.kind, total: count() })
		.from(aiRequests)
		.where(gte(aiRequests.startedAt, from))
		.groupBy(aiRequests.kind);
	const band = sql<number>`json_extract(${evaluations.result}, '$.estimatedBand')`;
	const bandDistribution = await db
		.select({ band, total: count() })
		.from(evaluations)
		.where(and(isNull(evaluations.deletedAt), gte(evaluations.createdAt, from), isNotNull(band)))
		.groupBy(band)
		.orderBy(asc(band));
	const sessionTrend = await db
		.select({ day: sql<string>`date(${practiceSessions.startedAt} / 1000, 'unixepoch')`, total: count() })
		.from(practiceSessions)
		.where(and(isNull(practiceSessions.deletedAt), gte(practiceSessions.startedAt, from)))
		.groupBy(sql`date(${practiceSessions.startedAt} / 1000, 'unixepoch')`)
		.orderBy(asc(sql`date(${practiceSessions.startedAt} / 1000, 'unixepoch')`));
	const evaluationTrend = await db
		.select({ day: sql<string>`date(${evaluations.createdAt} / 1000, 'unixepoch')`, total: count() })
		.from(evaluations)
		.where(and(isNull(evaluations.deletedAt), gte(evaluations.createdAt, from)))
		.groupBy(sql`date(${evaluations.createdAt} / 1000, 'unixepoch')`)
		.orderBy(asc(sql`date(${evaluations.createdAt} / 1000, 'unixepoch')`));
	const aiTrend = await db
		.select({
			day: sql<string>`date(${aiRequests.startedAt} / 1000, 'unixepoch')`,
			requests: count(),
			inputTokens: sql<number>`coalesce(sum(${aiRequests.inputTokens}), 0)`,
			outputTokens: sql<number>`coalesce(sum(${aiRequests.outputTokens}), 0)`,
			errors: sql<number>`coalesce(sum(case when ${aiRequests.status} = 'error' then 1 else 0 end), 0)`
		})
		.from(aiRequests)
		.where(gte(aiRequests.startedAt, from))
		.groupBy(sql`date(${aiRequests.startedAt} / 1000, 'unixepoch')`)
		.orderBy(asc(sql`date(${aiRequests.startedAt} / 1000, 'unixepoch')`));
	const kindTotals = { grading: 0, chat: 0 };
	for (const row of byKind) kindTotals[row.kind] = row.total;
	const requestTotal = aiSummary?.total ?? 0;
	return {
		days: Number(days),
		totalUsers: totalUsers?.totalUsers ?? 0,
		activeUsers: activeUsers?.activeUsers ?? 0,
		sessions: sessionsCount?.sessionsCount ?? 0,
		evaluatedWritings: evaluatedWritings?.evaluatedWritings ?? 0,
		requests: {
			...kindTotals,
			total: requestTotal,
			success: aiSummary?.requestsSuccess ?? 0,
			error: aiSummary?.requestsError ?? 0,
			errorRate:
				(aiSummary?.requestsError ?? 0) + (aiSummary?.requestsSuccess ?? 0)
					? (aiSummary?.requestsError ?? 0) /
						((aiSummary?.requestsError ?? 0) + (aiSummary?.requestsSuccess ?? 0))
					: 0,
			successRate:
				(aiSummary?.requestsError ?? 0) + (aiSummary?.requestsSuccess ?? 0)
					? (aiSummary?.requestsSuccess ?? 0) /
						((aiSummary?.requestsError ?? 0) + (aiSummary?.requestsSuccess ?? 0))
					: 0,
			averageLatencyMs: aiSummary?.averageLatencyMs ?? null,
			inputTokens: aiSummary?.inputTokens ?? 0,
			outputTokens: aiSummary?.outputTokens ?? 0
		},
		bandDistribution,
		sessionTrend,
		evaluationTrend,
		aiTrend
	};
});

const reportDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getAdminReport = query(
	z.object({ from: reportDateSchema, to: reportDateSchema }),
	async ({ from, to }) => {
		const { db } = await requireAdmin(getRequestEvent().locals);
		const start = new Date(`${from}T00:00:00.000Z`);
		const end = new Date(`${to}T00:00:00.000Z`);
		if (
			!Number.isFinite(start.getTime()) ||
			!Number.isFinite(end.getTime()) ||
			start.toISOString().slice(0, 10) !== from ||
			end.toISOString().slice(0, 10) !== to ||
			start > end
		) {
			error(400, "Invalid report date range.");
		}
		const dayCount = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
		if (dayCount > 366) error(400, "Reports are limited to 366 days.");
		const endExclusive = end.getTime() + 86_400_000;
		const sessionRows = await db
			.select({ day: sql<string>`date(${practiceSessions.startedAt} / 1000, 'unixepoch')`, sessions: count() })
			.from(practiceSessions)
			.where(
				and(
					isNull(practiceSessions.deletedAt),
					gte(practiceSessions.startedAt, start),
					sql`${practiceSessions.startedAt} < ${endExclusive}`
				)
			)
			.groupBy(sql`date(${practiceSessions.startedAt} / 1000, 'unixepoch')`);
		const evaluationRows = await db
			.select({ day: sql<string>`date(${evaluations.createdAt} / 1000, 'unixepoch')`, evaluations: count() })
			.from(evaluations)
			.where(
				and(
					isNull(evaluations.deletedAt),
					gte(evaluations.createdAt, start),
					sql`${evaluations.createdAt} < ${endExclusive}`
				)
			)
			.groupBy(sql`date(${evaluations.createdAt} / 1000, 'unixepoch')`);
		const aiRows = await db
			.select({
				day: sql<string>`date(${aiRequests.startedAt} / 1000, 'unixepoch')`,
				requests: count(),
				grading: sql<number>`sum(case when ${aiRequests.kind} = 'grading' then 1 else 0 end)`,
				chat: sql<number>`sum(case when ${aiRequests.kind} = 'chat' then 1 else 0 end)`,
				errors: sql<number>`sum(case when ${aiRequests.status} = 'error' then 1 else 0 end)`,
				inputTokens: sql<number>`coalesce(sum(${aiRequests.inputTokens}), 0)`,
				outputTokens: sql<number>`coalesce(sum(${aiRequests.outputTokens}), 0)`
			})
			.from(aiRequests)
			.where(and(gte(aiRequests.startedAt, start), sql`${aiRequests.startedAt} < ${endExclusive}`))
			.groupBy(sql`date(${aiRequests.startedAt} / 1000, 'unixepoch')`);
		const sessionMap = new Map(sessionRows.map((row) => [row.day, row.sessions]));
		const evaluationMap = new Map(evaluationRows.map((row) => [row.day, row.evaluations]));
		const aiMap = new Map(aiRows.map((row) => [row.day, row]));
		const rows = Array.from({ length: dayCount }, (_, index) => {
			const day = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10);
			const ai = aiMap.get(day);
			return {
				day,
				sessions: sessionMap.get(day) ?? 0,
				evaluations: evaluationMap.get(day) ?? 0,
				grading: ai?.grading ?? 0,
				chat: ai?.chat ?? 0,
				aiErrors: ai?.errors ?? 0,
				inputTokens: ai?.inputTokens ?? 0,
				outputTokens: ai?.outputTokens ?? 0
			};
		});
		return rows;
	}
);

export const getAdminAuditLogs = query(async () => {
	const { db } = await requireAdmin(getRequestEvent().locals);
	return db
		.select({
			id: adminAuditLogs.id,
			actor: users.name,
			action: adminAuditLogs.action,
			targetType: adminAuditLogs.targetType,
			targetId: adminAuditLogs.targetId,
			metadata: adminAuditLogs.metadata,
			createdAt: adminAuditLogs.createdAt
		})
		.from(adminAuditLogs)
		.leftJoin(users, eq(adminAuditLogs.actorUserId, users.id))
		.orderBy(sql`${adminAuditLogs.createdAt} DESC`)
		.limit(100);
});
