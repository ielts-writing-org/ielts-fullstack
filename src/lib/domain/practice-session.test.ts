import { describe, expect, it, test } from "vitest";
import {
	computePracticeStreak,
	getDeadlineEpochSeconds,
	getRemainingSeconds,
	getTimeLimitInMinutes,
	getTimeLimitInSeconds,
	TASK_TIME_LIMIT_MINUTES
} from "./practice-session.ts";

describe("getTimeLimitInMinutes", () => {
	it.each([
		["1" as const, 20],
		["2" as const, 40]
	])("uses the official Task %s limit", (category, expected) => {
		expect(getTimeLimitInMinutes(category)).toBe(expected);
		expect(TASK_TIME_LIMIT_MINUTES[category]).toBe(expected);
	});
});

describe("getTimeLimitInSeconds", () => {
	it.each([
		["1" as const, 1200],
		["2" as const, 2400]
	])("converts the Task %s limit to seconds", (category, expected) => {
		expect(getTimeLimitInSeconds(category)).toBe(expected);
	});
});

describe("getDeadlineEpochSeconds", () => {
	it.each([
		["1" as const, 1200],
		["2" as const, 2400]
	])("adds the Task %s limit to the start time", (category, seconds) => {
		const startedAt = new Date("2026-01-15T12:00:00Z");
		expect(getDeadlineEpochSeconds(startedAt, category)).toBe(
			Math.floor(startedAt.getTime() / 1000) + seconds
		);
	});

	it("accepts a millisecond timestamp", () => {
		const startedAtMs = Date.parse("2026-01-15T12:00:00Z");
		expect(getDeadlineEpochSeconds(startedAtMs, "1")).toBe(Math.floor(startedAtMs / 1000) + 1200);
	});

	it("ignores sub-second precision", () => {
		const startedAtMs = Date.parse("2026-01-15T12:00:00.999Z");
		expect(getDeadlineEpochSeconds(startedAtMs, "1")).toBe(Math.floor(startedAtMs / 1000) + 1200);
	});
});

describe("getRemainingSeconds", () => {
	const deadline = 1_800_000_000;

	it("returns the whole seconds left", () => {
		expect(getRemainingSeconds(deadline, (deadline - 90) * 1000)).toBe(90);
	});

	it("returns 0 at and after the deadline", () => {
		expect(getRemainingSeconds(deadline, deadline * 1000)).toBe(0);
		expect(getRemainingSeconds(deadline, (deadline + 60) * 1000)).toBe(0);
	});

	it("ignores sub-second precision", () => {
		expect(getRemainingSeconds(deadline, (deadline - 1) * 1000 + 999)).toBe(1);
	});
});

describe("computePracticeStreak()", () => {
	/** ISO day string for a Date, matching what the domain function consumes. */
	const day = (date: Date) => date.toISOString().slice(0, 10);
	const daysAgo = (n: number) => day(new Date(Date.now() - n * 86_400_000));

	test("no practice days means no streak", () => {
		expect(computePracticeStreak([])).toBe(0);
	});

	test("today alone is a one-day streak", () => {
		expect(computePracticeStreak([daysAgo(0)])).toBe(1);
	});

	test("yesterday alone still counts", () => {
		expect(computePracticeStreak([daysAgo(1)])).toBe(1);
	});

	test("a gap of two days breaks the streak", () => {
		expect(computePracticeStreak([daysAgo(0), daysAgo(2), daysAgo(3)])).toBe(1);
	});

	test("consecutive days ending today count up", () => {
		expect(computePracticeStreak([daysAgo(0), daysAgo(1), daysAgo(2)])).toBe(3);
	});

	test("consecutive days ending yesterday count up", () => {
		expect(computePracticeStreak([daysAgo(1), daysAgo(2), daysAgo(3)])).toBe(3);
	});

	test("duplicates do not inflate the streak", () => {
		expect(computePracticeStreak([daysAgo(0), daysAgo(0), daysAgo(1)])).toBe(2);
	});
});
