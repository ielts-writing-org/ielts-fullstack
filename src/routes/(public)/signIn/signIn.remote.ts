import { form, getRequestEvent } from "$app/server";
import { redirect } from "@sveltejs/kit";
import { APIError } from "better-auth";
import { z } from "zod";

export const signInSocial = form(
	z.object({
		provider: z.enum(["github", "google", "facebook"]),
		callbackURL: z.url()
	}),
	async ({ provider, callbackURL }) => {
		const { locals } = getRequestEvent();
		const { auth } = locals;

		try {
			const result = await auth.api.signInSocial({ body: { provider, callbackURL } });
			if (result.url) {
				return redirect(302, result.url, { external: true });
			}
			return { status: 400, success: false, message: "Social sign-in failed" };
		} catch (error) {
			if (error instanceof APIError) {
				return { status: 400, success: false, message: `Provider ${provider} is not supported` };
			}
			throw error;
		}
	}
);
