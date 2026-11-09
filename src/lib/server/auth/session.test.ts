import { describe, expect, it } from "vitest";
import { error } from "@sveltejs/kit";
import { getApiSession, getPageSession } from "./session.ts";

/**
 * Server-side session guards: API handlers respond 401 and pages redirect to
 * the sign-in page when there is no Better Auth session on the event locals.
 */
function localsWith(session: unknown, user: unknown) {
	return { session, user } as unknown as App.Locals;
}

describe("getApiSession", () => {
	it("returns the session and user when both are present", () => {
		const session = { id: "s1" };
		const user = { id: "u1" };
		const locals = localsWith(session, user);

		expect(getApiSession(locals)).toEqual({ session, user });
	});

	it("throws a 401 when the session is missing", () => {
		const user = { id: "u1" };
		try {
			getApiSession(localsWith(undefined, user));
			expect.unreachable("expected an error");
		} catch (e) {
			expect((e as { status: number }).status).toBe(401);
		}
	});

	it("throws a 401 when the user is missing", () => {
		const session = { id: "s1" };
		try {
			getApiSession(localsWith(session, undefined));
			expect.unreachable("expected an error");
		} catch (e) {
			expect((e as { status: number }).status).toBe(401);
		}
	});

	it("throws a 401 when both are missing", () => {
		try {
			getApiSession(localsWith(undefined, undefined));
			expect.unreachable("expected an error");
		} catch (e) {
			expect((e as { status: number }).status).toBe(401);
		}
	});
});

describe("getPageSession", () => {
	it("returns the session and user when both are present", () => {
		const session = { id: "s1" };
		const user = { id: "u1" };
		const locals = localsWith(session, user);

		expect(getPageSession(locals)).toEqual({ session, user });
	});

	it("redirects to the sign-in page when unauthenticated", () => {
		try {
			getPageSession(localsWith(undefined, undefined));
			expect.unreachable("expected a redirect");
		} catch (e) {
			expect((e as { status: number }).status).toBe(307);
			expect((e as { location: string }).location).toBe("/sign-in");
		}
	});

	it("matches the kit redirect thrown shape", () => {
		// Sanity-check the assertion shape against @sveltejs/kit's own redirect.
		try {
			error(401, "nope");
			expect.unreachable();
		} catch (e) {
			expect((e as { status: number }).status).toBe(401);
		}
	});
});
