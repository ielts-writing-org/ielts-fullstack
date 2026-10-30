/**
 * https://upstash.com/blog/sveltekit-rate-limiting
 */

import { dev } from "$app/env";
import { Redis } from "@upstash/redis";
import { Redis as RedisCF } from "@upstash/redis/cloudflare";

export let redis: Redis | RedisCF;

export function createRedisConnection() {
	if (dev) return;

	// TODO: Check if this work in preview and production
	redis = RedisCF.fromEnv();
}
