import type { createAuth } from "#lib/server/auth";
import type { auth } from "#lib/server/auth/cli.ts";
import type { TaskCategory } from "#lib/domain/task-category.ts";
import type { TaskSubcategory } from "#lib/domain/task-subcategory.ts";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			auth: ReturnType<typeof createAuth>;
			session?: typeof auth.$Infer.Session.session;
			user?: typeof auth.$Infer.Session.user;
		}

		interface PageData {
			metadata?: {
				title: string;
				taskCategory: TaskCategory;
				taskSubcategory: TaskSubcategory<TaskCategory>;
			};
		}

		// interface Platform {}
		// interface Error {}
		// interface PageState {}
	}
}

export {};
