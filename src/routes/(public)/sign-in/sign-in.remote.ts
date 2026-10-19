import { form, getRequestEvent } from "$app/server";
import { redirect } from "@sveltejs/kit";
import { APIError } from "better-auth";
import { z } from "zod";

export const signInSocial = form(
	z.object({
		callbackURL: z.url(),
		provider: z.enum(["github"])
	}),
	async ({ callbackURL, provider }) => {
		const { locals } = getRequestEvent();

		try {
			const result = await locals.auth.api.signInSocial({ body: { callbackURL, provider } });
			if (result.url) {
				return redirect(302, result.url, { external: true });
			}

			return { message: "Social sign-in failed", status: 400, success: false };
		} catch (error) {
			if (error instanceof APIError) {
				return { message: `Provider ${provider} is not supported`, status: 400, success: false };
			}

			throw error;
		}
	}
);
