import { building } from "$app/env";
import { createAuth } from "#lib/server/auth.ts";
import { sequence, type Handle } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { env } from "cloudflare:workers";
import { CloudflareAiClient } from "#lib/infra/external/ai-client/ai-client.cloudflare.ts";
import { CloudflareConfigProvider } from "#lib/infra/external/config-provider/config-provider.cloudflare.ts";
import { CloudflareImagesClient } from "#lib/infra/external/image-client/images-client.cloudflare.ts";

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	// TODO: Cache/Singleton
	event.locals.auth = createAuth(env.IELTS_WRITING_DB);

	const { auth } = event.locals;
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

const themeHandle: Handle = async ({ event, resolve }) => {
	const theme = event.cookies.get("theme") ?? "light";

	event.locals.theme = theme;

	return await resolve(event, {
		transformPageChunk: ({ html }) => html.replace("%theme%", theme)
	});
};

const dependencyInjection: Handle = async ({ event, resolve }) => {
	// TODO: Cache/Singleton
	event.locals.configProvider = new CloudflareConfigProvider(env.IELTS_WRITING_KV);
	event.locals.aiClient = new CloudflareAiClient(env.IELTS_WRITING_AI, event.locals.configProvider);
	event.locals.imagesClient = new CloudflareImagesClient(env.IELTS_WRITING_IMAGES);
	return await resolve(event);
};

export const handle = sequence(handleBetterAuth, themeHandle, dependencyInjection);
