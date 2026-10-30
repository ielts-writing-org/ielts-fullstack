import type { TaskCategory, TaskCategory } from "#lib/schemas/task-category.ts";
import type { TaskSubcategory } from "#lib/schemas/task-subcategory.ts";
import { auth, createAuth } from "#lib/server/auth.ts";
import type { ProfileEntity } from "#lib/server/db/app.schema.ts";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			auth: ReturnType<typeof createAuth>;
			session?: typeof auth.$Infer.Session.session;
			user?: typeof auth.$Infer.Session.user;
			profile?: ProfileEntity;
		}

		interface PageData {
			practiceSession?: PracticeSession<"1"> | PracticeSession<"2">;
		}

		// interface Platform {}
		// interface Error {}
		// interface PageState {}
	}
}

type PracticeSession<Category extends TaskCategory> = {
	title: string;
	type: "timed" | "free";
	taskCategory: Category;
	taskSubcategory: TaskSubcategory<Category>;
};

export {};
