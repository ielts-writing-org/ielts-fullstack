/**
 * https://better-auth.com/docs/concepts/database#custom-implementations
 */

import type { SecondaryStorage } from "better-auth";
import { getRedis } from "../redis";

export const redisSecondaryStorage: SecondaryStorage = {
	get(key) {
		return getRedis().get(key);
	},
	getAndDelete(key) {
		return getRedis().getdel(key);
	},
	async increment(key, ttl) {
		if (!Number.isInteger(ttl) || ttl <= 0) {
			throw new TypeError("Redis increment TTL must be a positive integer");
		}
		const [value] = await getRedis().multi().incr(key).expire(key, ttl, "NX").exec();
		return value;
	},
	async set(key, value, ttl) {
		// Use database for saving oauth verification state
		if (key.startsWith("verification:")) return;

		if (ttl) {
			await getRedis().set(key, value, { ex: ttl });
		} else {
			await getRedis().set(key, value);
		}
	},
	async delete(key) {
		await getRedis().del(key);
	}
};
