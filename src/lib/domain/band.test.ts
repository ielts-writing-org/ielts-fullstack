import { describe, expect, it } from "vitest";
import {
	BAND_MAX,
	BAND_MIN,
	bandSchema,
	combineWritingBands,
	getBandFraction,
	getBandPercentage,
	roundToNearestHalfBand
} from "./band.ts";

describe("bandSchema", () => {
	it("accepts every half-step band on the IELTS scale", () => {
		for (let band = BAND_MIN; band <= BAND_MAX; band += 0.5) {
			expect(bandSchema.safeParse(band).success).toBe(true);
		}
	});

	it.each([0, 0.5, 2.5, 6, 9])("accepts band %f", (band) => {
		expect(bandSchema.safeParse(band).success).toBe(true);
	});

	it.each([-1, -0.5, 9.5, 10, Number.NaN, Number.POSITIVE_INFINITY])("rejects band %f", (band) => {
		expect(bandSchema.safeParse(band).success).toBe(false);
	});

	it.each(["6", null, undefined, {}, true])("rejects non-number %s", (value) => {
		expect(bandSchema.safeParse(value).success).toBe(false);
	});
});

describe("roundToNearestHalfBand()", () => {
	it.each([
		[0, 0],
		[0.24, 0],
		[0.25, 0.5],
		[0.74, 0.5],
		[0.75, 1],
		[1.2, 1],
		[1.75, 2],
		[6.24, 6],
		[6.25, 6.5],
		[6.74, 6.5],
		[6.75, 7],
		[8.99, 9]
	])("rounds %f to %f", (value, expected) => {
		expect(roundToNearestHalfBand(value)).toBe(expected);
	});

	it("keeps every half-step band unchanged", () => {
		for (let band = BAND_MIN; band <= BAND_MAX; band += 0.5) {
			expect(roundToNearestHalfBand(band)).toBe(band);
		}
	});

	it("mirrors negative values", () => {
		expect(roundToNearestHalfBand(-1.2)).toBe(-1);
		expect(roundToNearestHalfBand(-1.25)).toBe(-1.5);
	});
});

describe("getBandFraction()", () => {
	it.each([
		[0, 0],
		[4.5, 0.5],
		[9, 1]
	])("maps band %f to the fraction %f", (band, expected) => {
		expect(getBandFraction(band)).toBeCloseTo(expected);
	});

	it.each([
		[-2, 0],
		[12, 1]
	])("clamps band %f to the fraction %f", (band, expected) => {
		expect(getBandFraction(band)).toBe(expected);
	});
});

describe("getBandPercentage()", () => {
	it.each([
		[0, 0],
		[4.5, 50],
		[7.5, 83.333],
		[9, 100]
	])("maps band %f to %f%%", (band, expected) => {
		expect(getBandPercentage(band)).toBeCloseTo(expected);
	});

	it("increases monotonically across the band scale", () => {
		for (let band = 0.5; band <= BAND_MAX; band += 0.5) {
			expect(getBandPercentage(band)).toBeGreaterThan(getBandPercentage(band - 0.5));
		}
	});

	it("clamps bands outside the IELTS scale", () => {
		expect(getBandPercentage(-2)).toBe(0);
		expect(getBandPercentage(12)).toBe(100);
	});
});

describe("combineWritingBands()", () => {
	it("weights Task 2 twice when both tasks are graded", () => {
		expect(combineWritingBands(6, 7.5)).toBeCloseTo(7);
		expect(combineWritingBands(5, 7)).toBeCloseTo(6.3333, 3);
		expect(combineWritingBands(7, 7)).toBe(7);
	});

	it("uses the only graded task", () => {
		expect(combineWritingBands(6.5, null)).toBe(6.5);
		expect(combineWritingBands(null, 7.5)).toBe(7.5);
	});

	it("returns 0 when neither task is graded", () => {
		expect(combineWritingBands(null, null)).toBe(0);
	});

	it("rounds to the nearest half band when combined with the formatter", () => {
		expect(roundToNearestHalfBand(combineWritingBands(6, 7.5))).toBe(7);
		expect(roundToNearestHalfBand(combineWritingBands(5, 7))).toBe(6.5);
		expect(roundToNearestHalfBand(combineWritingBands(null, 6.8))).toBe(7);
	});
});
