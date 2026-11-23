import { describe, expect, it } from "vitest";
import {
	getDeadlineEpochSeconds,
	getRemainingSeconds,
	getTimeLimitInMinutes,
	getTimeLimitInSeconds,
	TASK_TIME_LIMIT_MINUTES
} from "./ielts-timing.ts";

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
