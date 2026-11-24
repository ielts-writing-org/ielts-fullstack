import { command, getRequestEvent, query } from "$app/server";
import { APIError } from "better-auth/api";
import { error } from "@sveltejs/kit";
import { getAdminSession } from "#lib/server/auth/session.ts";
import {
	countActiveAdmins,
	findUserById,
	listAdminUsers,
	countAdminUsers
} from "#lib/server/data/users.ts";
import { recordAdminAction } from "#lib/server/data/admin-audit-logs.ts";
import { adminUserIdSchema } from "./admin.schema.ts";
import {
	getAdminUsersInput,
	setAdminUserLockedInput,
	setAdminUserRoleInput
} from "./admin-users.schema.ts";

function rethrowAsHttpError(cause: unknown): never {
	if (cause instanceof APIError) {
		const message = cause.message || "Administrator action failed.";
		if (cause.status === 400) error(400, message);
		if (cause.status === 403) error(403, message);
		if (cause.status === 404) error(404, message);
	}
	throw cause;
}

export const getAdminUsers = query(
	getAdminUsersInput,
	async ({ page, pageSize, search, role, status }) => {
		const { user: adminUser } = await getAdminSession(getRequestEvent().locals);
		const filters = { page, pageSize, search, role, status };
		const [total, users] = await Promise.all([countAdminUsers(filters), listAdminUsers(filters)]);
		return {
			users,
			page,
			pageSize,
			total,
			currentAdminId: adminUser.id
		};
	}
);

export const setAdminUserRole = command(setAdminUserRoleInput, async ({ userId, isAdmin }) => {
	const event = getRequestEvent();
	const { user } = await getAdminSession(event.locals);

	if (userId === user.id) error(400, "You cannot change your own administrator role.");

	const target = await findUserById(userId);
	if (!target) error(404, "User not found.");
	if (isAdmin === (target.role === "admin")) return { success: true };
	if (!isAdmin && (await countActiveAdmins()) <= 1) {
		error(409, "The last active administrator cannot be removed.");
	}
	await event.locals.auth.api
		.setRole({
			body: { userId, role: isAdmin ? "admin" : "user" },
			headers: event.request.headers
		})
		.catch(rethrowAsHttpError);
	await recordAdminAction(
		user.id,
		isAdmin ? "user.role.grant" : "user.role.revoke",
		"user",
		userId
	);
	return { success: true };
});

export const setAdminUserLocked = command(
	setAdminUserLockedInput,
	async ({ userId, locked, reason }) => {
		const event = getRequestEvent();
		const { user } = await getAdminSession(event.locals);

		if (userId === user.id) error(400, "You cannot lock your own account.");

		const target = await findUserById(userId);
		if (!target) error(404, "User not found.");
		const isLocked = Boolean(
			target.banned && (!target.banExpires || target.banExpires.getTime() > Date.now())
		);
		if (isLocked === locked) {
			return { success: true };
		}
		if (locked && target.role === "admin" && (await countActiveAdmins()) <= 1) {
			error(409, "Cannot lock the last active administrator.");
		}
		if (locked) {
			await event.locals.auth.api
				.banUser({
					body: { userId, banReason: reason || "Locked by an administrator." },
					headers: event.request.headers
				})
				.catch(rethrowAsHttpError);
		} else {
			await event.locals.auth.api
				.unbanUser({ body: { userId }, headers: event.request.headers })
				.catch(rethrowAsHttpError);
		}
		await recordAdminAction(user.id, locked ? "user.lock" : "user.unlock", "user", userId, {
			reasonProvided: locked && reason.length > 0
		});
		return { success: true };
	}
);

export const revokeAdminUserSessions = command(adminUserIdSchema, async ({ userId }) => {
	const event = getRequestEvent();
	const { user } = await getAdminSession(event.locals);
	if (userId === user.id) error(400, "You cannot revoke your own sessions from user management.");
	const target = await findUserById(userId);
	if (!target) error(404, "User not found.");
	await event.locals.auth.api.revokeUserSessions({
		body: { userId },
		headers: event.request.headers
	});
	await recordAdminAction(user.id, "user.sessions.revoke", "user", userId);
	return { success: true };
});
