import { describe, expect, it } from "vitest";
import {
	getAllowedImageMimeTypes,
	isValidTaskImageExtension,
	isValidTaskImageName,
	taskImageSchema
} from "./task-image.ts";

const VALID_UUIDV7 = "018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b";

describe.concurrent("isValidTaskImageExtension", () => {
	it.concurrent.each([
		["accepts", "jpeg", true],
		["accepts", "png", true],
		["accepts", "webp", true],
		["accepts", "avif", true],
		["rejects", "gif", false],
		["rejects", "svg", false],
		["rejects", "jpg", false],
		["accepts", "", false],
		["accepts", undefined as unknown as string, false]
	])("%s %s extension", (_, ext, expected) => {
		expect(isValidTaskImageExtension(ext)).toBe(expected);
	});

	it("rejects empty extension", () => {
		expect(isValidTaskImageExtension("")).toBe(false);
	});

	it("rejects undefined extension", () => {
		expect(isValidTaskImageExtension(undefined as unknown as string)).toBe(false);
	});
});

describe("isValidTaskImageName", () => {
	it("accepts a UUIDv7 name with a supported extension", () => {
		expect(isValidTaskImageName(`${VALID_UUIDV7}.png`)).toBe(true);
		expect(isValidTaskImageName(`${VALID_UUIDV7}.webp`)).toBe(true);
	});

	it("rejects names whose id is not a UUIDv7", () => {
		expect(isValidTaskImageName(`not-a-uuid.png`)).toBe(false);
		expect(isValidTaskImageName(`550e8400-e29b-41d4-a716-446655440000.png`)).toBe(false);
	});

	it("rejects unsupported extensions", () => {
		expect(isValidTaskImageName(`${VALID_UUIDV7}.gif`)).toBe(false);
	});

	it("rejects uppercase extensions", () => {
		expect(isValidTaskImageName(`${VALID_UUIDV7}.PNG`)).toBe(false);
	});

	it("rejects names without an extension", () => {
		expect(isValidTaskImageName(VALID_UUIDV7)).toBe(false);
	});

	it("rejects names containing multiple dots", () => {
		expect(isValidTaskImageName(`a.b.${VALID_UUIDV7}.png`)).toBe(false);
	});
});

describe("getAllowedImageMimeTypes", () => {
	it("mirrors the supported extensions", () => {
		expect(getAllowedImageMimeTypes()).toEqual([
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/avif"
		]);
	});
});

describe("taskImageSchema", () => {
	it("accepts a small PNG file", () => {
		const file = new File([new Uint8Array(64)], "chart.png", { type: "image/png" });
		expect(taskImageSchema.safeParse(file).success).toBe(true);
	});

	it("accepts a file exactly at the 1MB limit", () => {
		const file = new File([new Uint8Array(1024 * 1024)], "chart.png", { type: "image/png" });
		expect(taskImageSchema.safeParse(file).success).toBe(true);
	});

	it("rejects files above the 1MB limit", () => {
		const file = new File([new Uint8Array(1024 * 1024 + 1)], "chart.png", { type: "image/png" });
		expect(taskImageSchema.safeParse(file).success).toBe(false);
	});

	it("rejects unsupported mime types", () => {
		const file = new File([new Uint8Array(16)], "notes.txt", { type: "text/plain" });
		expect(taskImageSchema.safeParse(file).success).toBe(false);
	});

	it("rejects non-file values", () => {
		expect(taskImageSchema.safeParse("chart.png").success).toBe(false);
		expect(taskImageSchema.safeParse(undefined).success).toBe(false);
	});
});
