import type { AiClient } from "#lib/server/infra/external/ai-client/ai-client.port.ts";
import type { ConfigProvider } from "#lib/server/infra/external/config-provider/config-provider.port.ts";
import type { ImagesClient } from "#lib/server/infra/external/image-client/images-client.port.ts";
import { auth, createAuth } from "#lib/server/auth.ts";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// TODO: This does not work in SvelteKit 3
		// interface Platform {
		// 	env: Env;
		// 	ctx: ExecutionContext;
		// 	caches: CacheStorage;
		// 	cf?: IncomingRequestCfProperties;
		// }

		interface Locals {
			theme?: string;
			session?: typeof auth.$Infer.Session;
			auth: ReturnType<typeof createAuth>;
			configProvider: ConfigProvider;
			aiClient: AiClient;
			imagesClient: ImagesClient;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
