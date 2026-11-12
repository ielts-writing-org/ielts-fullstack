import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";

export function getRateLimiter(name: "chat" | "evaluate"): RateLimit {
	if (name === "chat") return env.CHAT_RATE_LIMITER;
	else if (name === "evaluate") return env.EVALUATE_RATE_LIMITER;
	throw new Error("Unknown Rate limiter.");
}

export async function rateLimit(identifier: string, rateLimiter: RateLimit) {
	const { success } = await rateLimiter.limit({ key: identifier });
	if (!success) {
		error(429, `Too many requests. Please try again later`);
	}
}
