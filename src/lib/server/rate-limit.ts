import { RATE_LIMIT_TOKENS, RATE_LIMIT_WINDOW } from "$app/env/private";

import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";
import { dev } from "$app/env";
import { error } from "@sveltejs/kit";

export let rateLimiter: Ratelimit;

export function createRateLimiter() {
	if (dev) return;

	rateLimiter = new Ratelimit({
		redis: redis,
		limiter: Ratelimit.slidingWindow(RATE_LIMIT_TOKENS, RATE_LIMIT_WINDOW)
	});
}

export async function rateLimit(identifier: string | (() => string)) {
	if (!dev) {
		let id: string;
		if (typeof identifier === "string") id = identifier;
		else id = identifier();
		const rateLimitAttempt = await rateLimiter.limit(id);
		if (!rateLimitAttempt.success) {
			const timeRemaining = Math.floor((rateLimitAttempt.reset - new Date().getTime()) / 1000);
			error(429, `Too many requests. Please try again in ${timeRemaining} seconds.`);
		}
	}
}
