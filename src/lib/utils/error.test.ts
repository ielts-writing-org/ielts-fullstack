import { describe, expect, it } from "vitest";
import { z } from "zod";
import { getZodErrors } from "./error.ts";

/**
 * Form/remote validation surfaces map zod issues onto `field` + `message`
 * pairs, with root issues reported as `formError`. The path shapes are used by
 * ValidationErrors and remote error helpers.
 */
describe("getZodErrors", () => {
	const schema = z.object({
		name: z.string(),
		address: z.object({
			city: z.string(),
			zip: z.string()
		}),
		tags: z.array(z.string())
	});

	it("collects nested field paths", () => {
		const result = schema.safeParse({
			name: 123,
			address: { city: 456, zip: "ok" },
			tags: ["a", 1]
		});

		expect(result.success).toBe(false);
		const errors = getZodErrors(result.error!);

		const fields = errors.map((error) => error.field);
		expect(fields).toContain("name");
		expect(fields).toContain("address.city");
		expect(fields).toContain("tags.1");
	});

	it("attaches a message to every error", () => {
		const result = schema.safeParse({ name: 1, address: { city: 2, zip: 3 }, tags: [] });
		const errors = getZodErrors(result.error!);
		expect(errors.length).toBeGreaterThan(0);
		for (const error of errors) {
			expect(typeof error.message).toBe("string");
			expect(error.message.length).toBeGreaterThan(0);
		}
	});

	it("reports root issues as formError", () => {
		const schemaWithRootCheck = z.object({ a: z.string() }).refine(() => false, "root broken");
		const result = schemaWithRootCheck.safeParse({ a: "x" });

		const errors = getZodErrors(result.error!);
		const root = errors.find((error) => error.field === "formError");
		expect(root).toBeDefined();
		expect(root!.message).toBe("root broken");
	});

	it("returns an empty list for successful parses", () => {
		const result = schema.safeParse({ name: "x", address: { city: "y", zip: "z" }, tags: [] });
		expect(result.success).toBe(true);
	});
});
