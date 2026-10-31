import { defineEnvVars } from "@sveltejs/kit/env";
import type { Ratelimit } from "@upstash/ratelimit";
import { z } from "zod";

export const variables = defineEnvVars({
	ORIGIN: {
		description: "The app origin (base URL), e.g. `http://localhost:5173`.",
		public: true
	},
	BETTER_AUTH_SECRET: {
		description:
			"Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation)."
	},
	BETTER_AUTH_API_KEY: {
		description:
			"API key used to for dashboard authentication. See [Better Auth Dashboard plugin](https://better-auth.com/docs/infrastructure/plugins/dashboard)."
	},
	GITHUB_CLIENT_ID: {
		description:
			"GitHub OAuth client ID. See [Better Auth GitHub provider](https://www.better-auth.com/docs/authentication/github)."
	},
	GITHUB_CLIENT_SECRET: {
		description:
			"GitHub OAuth client secret. See [Better Auth GitHub provider](https://www.better-auth.com/docs/authentication/github)."
	},
	UPSTASH_REDIS_REST_URL: {
		description: "REST URL for the Upstash Redis database."
	},
	UPSTASH_REDIS_REST_TOKEN: {
		description: "Authentication token for the Upstash Redis database."
	},
	RATE_LIMIT_TOKENS: {
		description: "Maximum number of requests allowed during the rate limit window.",
		schema: z.coerce.number()
	},
	RATE_LIMIT_WINDOW: {
		description: "Duration of the rate limit window, in ISO 8601 format.",
		schema: z
			.string()
			.regex(/^\d+(?:\.\d+)?\s*(ms|s|m|h|d|w)$/, {
				message: "Invalid duration format. Expected format like '10s', '1.5 m', or '24h'."
			})
			.transform((val) => val as Parameters<typeof Ratelimit.slidingWindow>[1])
	}
});
