import { expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

import InitialsAvatar from "./InitialsAvatar.svelte";

it("should contains PT for Phung Van Tu", async () => {
	await render(InitialsAvatar, { name: "Phung Van Tu" });
	await expect.element(page.getByRole("img")).toHaveTextContent("PT");
});

it("should contains VT for Van Tu", async () => {
	await render(InitialsAvatar, { name: "Van Tu" });
	await expect.element(page.getByRole("img")).toHaveTextContent("VT");
});
