import { auth, createAuth } from "#lib/server/auth.ts";
import type { Profile } from "#lib/server/db/app.schema.ts";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			auth: ReturnType<typeof createAuth>;
			session?: typeof auth.$Infer.Session.session;
			user?: typeof auth.$Infer.Session.user;
			profile?: Profile;
			theme?: string;
		}

		// interface Platform {}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
