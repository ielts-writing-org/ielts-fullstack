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

it("should contains T for Tu", async () => {
	await render(InitialsAvatar, { name: "Tu" });
	await expect.element(page.getByRole("img")).toHaveTextContent("T");
});

it("should contains IW for undefined name", async () => {
	await render(InitialsAvatar, { name: undefined! });
	await expect.element(page.getByRole("img")).toHaveTextContent("IW");
});

it("should contains IW for empty name", async () => {
	await render(InitialsAvatar, { name: "" });
	await expect.element(page.getByRole("img")).toHaveTextContent("IW");
});

it("should contains IW for whitespace-only name", async () => {
	await render(InitialsAvatar, { name: "     " });
	await expect.element(page.getByRole("img")).toHaveTextContent("IW");
});
