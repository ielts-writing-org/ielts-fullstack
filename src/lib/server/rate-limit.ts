import { RATE_LIMIT_TOKENS, RATE_LIMIT_WINDOW } from "$app/env/private";
import { error } from "@sveltejs/kit";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

let defaultRateLimiter: Ratelimit | undefined;

function getDefaultRateLimiter(): Ratelimit {
	return (defaultRateLimiter ??= new Ratelimit({
		redis: getRedis(),
		limiter: Ratelimit.slidingWindow(RATE_LIMIT_TOKENS, RATE_LIMIT_WINDOW)
	}));
}

export async function rateLimit(identifier: string) {
	const rateLimitAttempt = await getDefaultRateLimiter().limit(identifier);
	if (!rateLimitAttempt.success) {
		const timeRemaining = Math.floor((rateLimitAttempt.reset - new Date().getTime()) / 1000);
		error(429, `Too many requests. Please try again in ${timeRemaining} seconds.`);
	}
}
