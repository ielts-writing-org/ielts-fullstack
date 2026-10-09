import { defineEnvVars } from "@sveltejs/kit/env";

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
	}
});
