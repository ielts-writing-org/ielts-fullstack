/**
 * https://upstash.com/blog/sveltekit-rate-limiting
 */

import { dev } from "$app/env";
import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from "$app/env/private";
import { Redis } from "@upstash/redis";
import { Redis as RedisCF } from "@upstash/redis/cloudflare";

let redis: Redis | undefined;

export function getRedis(): Redis {
	if (dev) {
		return (redis ??= stripUpstashShebang(
			new Redis({
				url: UPSTASH_REDIS_REST_URL,
				token: UPSTASH_REDIS_REST_TOKEN
			})
		));
	}
	return (redis ??= RedisCF.fromEnv());
}

/**
 * Strips the Upstash shebang from Lua scripts
 * @param redis
 * @returns
 *
 * @see https://upstash.com/docs/redis/commands/scripting/evalsha
 */
function stripUpstashShebang(redis: Redis): Redis {
	const strip = (script: string) =>
		script.startsWith("#!lua") ? script.slice(script.indexOf("\n") + 1) : script;
	return new Proxy(redis, {
		get(target, prop) {
			if (prop === "eval") {
				return (script: string, keys: string[], args: unknown[]) =>
					target.eval(strip(script), keys, args);
			}
			const value = Reflect.get(target, prop);
			return typeof value === "function" ? value.bind(target) : value;
		}
	});
}
