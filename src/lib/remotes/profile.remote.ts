import { command, getRequestEvent, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { getApiSession } from "#lib/server/auth/session.ts";
import { findProfileByUserId, updateProfileBandTarget } from "#lib/server/data/profiles.ts";
import { saveBandTargetInput } from "./profile.schema.ts";

export const getProfile = query(async () => {
	const { locals } = getRequestEvent();
	const { user } = getApiSession(locals);

	const profile = await findProfileByUserId(user.id);

	if (!profile) {
		error(404);
	}

	return profile;
});

export const saveBandTarget = command(saveBandTargetInput, async ({ bandTarget }) => {
	const { locals } = getRequestEvent();
	const { user } = getApiSession(locals);

	const [updatedProfile] = await updateProfileBandTarget(user.id, bandTarget);

	if (!updatedProfile) {
		error(404, "Profile does not exist.");
	}

	getProfile().set(updatedProfile);
});
