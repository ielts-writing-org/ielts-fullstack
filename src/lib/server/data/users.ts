import { and, asc, count, eq, isNull, like, ne, or, sql } from "drizzle-orm";
import { users } from "../db/auth.schema";
import { getDatabase } from "../db/index.ts";

export async function countUsers() {
	const [row] = await getDatabase().select({ total: count() }).from(users);
	return row?.total ?? 0;
}

export function findUserById(userId: string) {
	return getDatabase().query.users.findFirst({
		columns: { id: true, role: true, banned: true, banExpires: true },
		where: { id: userId }
	});
}

/** Admins whose ban is missing or expired are still active. */
export async function countActiveAdmins() {
	const now = Date.now();
	const [row] = await getDatabase()
		.select({ total: count() })
		.from(users)
		.where(
			and(
				eq(users.role, "admin"),
				sql`(${users.banned} IS NULL OR ${users.banned} = 0 OR ${users.banExpires} <= ${now})`
			)
		);
	return row?.total ?? 0;
}

export type AdminUserFilters = {
	page: number;
	pageSize: number;
	search: string;
	role: "all" | "admin" | "user";
	status: "all" | "active" | "locked";
};

function adminUserConditions(filters: AdminUserFilters) {
	const now = Date.now();
	const locked = sql`(${users.banned} = 1 AND (${users.banExpires} IS NULL OR ${users.banExpires} > ${now}))`;
	const active = sql`(${users.banned} IS NULL OR ${users.banned} = 0 OR ${users.banExpires} <= ${now})`;
	const conditions = [];
	if (filters.search) {
		const pattern = `%${filters.search}%`;
		conditions.push(or(like(users.name, pattern), like(users.email, pattern))!);
	}
	if (filters.role === "admin") conditions.push(eq(users.role, "admin"));
	if (filters.role === "user") conditions.push(or(isNull(users.role), ne(users.role, "admin"))!);
	if (filters.status === "locked") conditions.push(locked);
	if (filters.status === "active") conditions.push(active);
	return conditions.length ? and(...conditions) : undefined;
}

export async function countAdminUsers(filters: AdminUserFilters) {
	const [row] = await getDatabase()
		.select({ total: count() })
		.from(users)
		.where(adminUserConditions(filters));
	return row?.total ?? 0;
}

export function listAdminUsers(filters: AdminUserFilters) {
	const now = Date.now();
	return getDatabase()
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			image: users.image,
			role: users.role,
			banned: users.banned,
			banExpires: users.banExpires,
			createdAt: users.createdAt,
			lastActiveAt: users.lastActiveAt,
			locked: sql<boolean>`(${users.banned} = 1 AND (${users.banExpires} IS NULL OR ${users.banExpires} > ${now}))`
		})
		.from(users)
		.where(adminUserConditions(filters))
		.orderBy(asc(users.name), asc(users.email))
		.limit(filters.pageSize)
		.offset((filters.page - 1) * filters.pageSize);
}
