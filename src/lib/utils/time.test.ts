import { describe, expect, test } from "vitest";
import { formatRelativeTime } from "./time";

const NOW = new Date(2026, 0, 15, 12, 0, 0);

/** A local-noon date `days` before NOW (avoids DST edge cases). */
const noonDaysBefore = (days: number) =>
	new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - days, 12, 0, 0);

const minutesAfterNow = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

describe("formatRelativeTime()", () => {
	test.each([
		["just now", new Date(NOW.getTime() - 30_000), "Just now"],
		["1 minute ago", new Date(NOW.getTime() - 60_000), "1 minute ago"],
		["5 minutes ago", new Date(NOW.getTime() - 5 * 60_000), "5 minutes ago"],
		["1 hour ago", new Date(NOW.getTime() - 60 * 60_000), "1 hour ago"],
		["5 hours ago", new Date(NOW.getTime() - 5 * 60 * 60_000), "5 hours ago"],
		["23 hours ago", new Date(NOW.getTime() - 23 * 60 * 60_000), "23 hours ago"],
		["yesterday", noonDaysBefore(1), "Yesterday"],
		["2 days ago", noonDaysBefore(2), "2 days ago"],
		["6 days ago", noonDaysBefore(6), "6 days ago"],
		["1 week ago (7 days)", noonDaysBefore(7), "1 week ago"],
		["1 week ago (13 days)", noonDaysBefore(13), "1 week ago"],
		["2 weeks ago", noonDaysBefore(14), "2 weeks ago"],
		["4 weeks ago", noonDaysBefore(29), "4 weeks ago"],
		["1 month ago", noonDaysBefore(30), "1 month ago"],
		["2 months ago", noonDaysBefore(60), "2 months ago"],
		["1 year ago", noonDaysBefore(365), "1 year ago"],
		["2 years ago", noonDaysBefore(800), "2 years ago"]
	])("formats %s as %s", (_, value, expected) => {
		expect(formatRelativeTime(value, NOW)).toBe(expected);
	});

	test.each([
		["just now", minutesAfterNow(0), "Just now"],
		["in 5 minutes", minutesAfterNow(5), "in 5 minutes"],
		["in 2 hours", minutesAfterNow(120), "in 2 hours"],
		[
			"in 2 days",
			new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 2, 12, 0, 0),
			"in 2 days"
		]
	])("formats a future time of %s as %s", (_, value, expected) => {
		expect(formatRelativeTime(value, NOW)).toBe(expected);
	});

	test("accepts a timestamp in milliseconds", () => {
		expect(formatRelativeTime(NOW.getTime() - 3 * 60 * 60_000, NOW)).toBe("3 hours ago");
	});

	test("returns an empty string for an invalid date", () => {
		expect(formatRelativeTime(new Date(Number.NaN), NOW)).toBe("");
	});
});
