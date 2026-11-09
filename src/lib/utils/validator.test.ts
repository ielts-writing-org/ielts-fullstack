import { describe, expect, it } from "vitest";
import { isValidUUIDv7 } from "./validator.ts";

/**
 * Route params (practiceSessionId, taskId) are validated as UUIDv7 and task
 * image names embed UUIDv7 file ids, so the validator's contract is pinned.
 */
describe("isValidUUIDv7", () => {
	it("accepts a valid UUIDv7", () => {
		expect(isValidUUIDv7("018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b")).toBe(true);
		expect(isValidUUIDv7("019201a1-7000-7e00-8000-000000000001")).toBe(true);
	});

	it("accepts uppercase UUIDv7", () => {
		expect(isValidUUIDv7("018F3A2B-4C5D-7E8F-9A0B-1C2D3E4F5A6B")).toBe(true);
	});

	it("rejects other UUID versions", () => {
		expect(isValidUUIDv7("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
		expect(isValidUUIDv7("018f3a2b-4c5d-4e8f-9a0b-1c2d3e4f5a6b")).toBe(false);
	});

	it("rejects invalid variants", () => {
		expect(isValidUUIDv7("018f3a2b-4c5d-7e8f-0a0b-1c2d3e4f5a6b")).toBe(false);
		expect(isValidUUIDv7("018f3a2b-4c5d-7e8f-ca0b-1c2d3e4f5a6b")).toBe(false);
	});

	it("rejects malformed strings", () => {
		expect(isValidUUIDv7("")).toBe(false);
		expect(isValidUUIDv7("not-a-uuid")).toBe(false);
		expect(isValidUUIDv7("018f3a2b4c5d7e8f9a0b1c2d3e4f5a6b")).toBe(false);
		expect(isValidUUIDv7("018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6")).toBe(false);
		expect(isValidUUIDv7("018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b0")).toBe(false);
	});

	it("rejects non-hex content", () => {
		expect(isValidUUIDv7("018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6g")).toBe(false);
	});
});
