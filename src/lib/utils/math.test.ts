import { describe, expect, test } from "vitest";
import { roundToNearestHalf } from "./math";

describe("roundToNearestHalf()", () => {
	test.each([
		[0, 0],
		[0.24, 0],
		[0.25, 0.5],
		[0.74, 0.5],
		[-1.2, -1],
		[-1.25, -1.5],
		[1.0, 1.0],
		[1.2, 1.0],
		[1.5, 1.5],
		[1.7, 1.5],
		[1.75, 2.0],
		[1.82, 2.0]
	])("roundToNearestHalf(%f) should return %f", (num, expected) => {
		const output = roundToNearestHalf(num);
		expect(output).toBe(expected);
	});
});
