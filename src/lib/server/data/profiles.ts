import { eq } from "drizzle-orm";
import { profiles } from "../db/app.schema";
import { getDatabase } from "../db/index.ts";

export function findProfileByUserId(userId: string) {
	return getDatabase().query.profiles.findFirst({
		where: { userId }
	});
}

export function updateProfileBandTarget(userId: string, bandTarget: number) {
	return getDatabase()
		.update(profiles)
		.set({ bandTarget })
		.where(eq(profiles.userId, userId))
		.returning();
}

export function insertProfile(userId: string) {
	return getDatabase().insert(profiles).values({ userId });
}
