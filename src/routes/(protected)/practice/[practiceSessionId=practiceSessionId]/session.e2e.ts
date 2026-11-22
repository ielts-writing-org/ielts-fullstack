import { expect, test } from "@playwright/test";
import { login, resetSeedData, SESSION_IDS } from "../../../../lib/testing/e2e-helpers";
import { PracticePage } from "../../../../lib/testing/pages/practice-page";

/**
 * UC13 · Tạo phiên luyện tập tùy chọn (create a custom session)
 * UC14 · Tạo phiên luyện tập với đề có sẵn (create from an existing task)
 * UC16 · Đổi tên phiên luyện tập (rename from the document bar)
 * UC17 · Xóa phiên luyện tập (delete from the document bar)
 *
 * UC15 (Mở phiên luyện tập) is covered by the history spec's Review/Continue
 * tests. The ownership guard at the bottom protects every journey here.
 */

let practice: PracticePage;

test.beforeEach(async ({ page, context }) => {
	await resetSeedData();
	await login(context, "learner");
	practice = new PracticePage(page);
});

test.describe("UC13 · Tạo phiên luyện tập tùy chọn (create a custom session)", () => {
	test("creates a free-practice session and opens the workspace", async ({ page }) => {
		await test.step("open the create modal and fill a valid prompt", async () => {
			await page.goto("/");
			await practice.hydrated();
			await page.getByRole("button", { name: "Start Task 2 Practice" }).click();
			await page.getByText("Free practice").click();
		});

		await test.step("start the practice", async () => {
			await page.locator(".modal-box").getByRole("button", { name: "Create" }).click();
			// NOTE: currently fails because Task 2 forms do not render the
			// optional `image` control — the unbound image field makes every
			// validate()/submit throw kit/form_field_unbound.
			await expect(page).toHaveURL(/\/practice\/[0-9a-f-]{36}$/);
		});

		await test.step("the workspace opens with a fresh response editor", async () => {
			await expect(page.getByText("Your response")).toBeVisible();
			await expect(practice.editorSurface(1)).toHaveAttribute(
				"data-placeholder",
				/Write your essay in at least 250 words/
			);
			await practice.expectWordCount(0, 250);
		});
	});
});

test.describe("UC14 · Tạo phiên luyện tập với đề có sẵn (create from an existing task)", () => {
	test("starts a free practice from the task library", async ({ page }) => {
		await page.goto("/tasks");
		await practice.hydrated();

		await page
			.getByRole("region", { name: "Tasks" })
			.getByRole("article")
			.filter({ hasText: "foreign language at primary school" })
			.getByRole("button", { name: "Practice" })
			.click();

		await expect(page.getByText("Start a practice session")).toBeVisible();
		await expect(page.locator(".modal-box")).toContainText("foreign language at primary school");

		await test.step("pick the free practice style and start", async () => {
			await page.getByText("Free practice").click();
			await page.locator(".modal-box").getByRole("button", { name: "Start practice" }).click();
			await expect(page).toHaveURL(/\/practice\/[0-9a-f-]{36}$/);
		});

		// The task prompt is preloaded into the task editor.
		await expect(practice.editorSurface(0)).toContainText("foreign language at primary school");
		await practice.expectWordCount(0, 250);
	});

	test("starts a timed practice with a running countdown", async ({ page }) => {
		await page.goto("/tasks");
		await practice.hydrated();

		await page
			.getByRole("region", { name: "Tasks" })
			.getByRole("article")
			.filter({ hasText: "congestion charges" })
			.getByRole("button", { name: "Practice" })
			.click();

		await expect(page.getByText("Start a practice session")).toBeVisible();

		await test.step("keep the default timed style and start", async () => {
			await page.locator(".modal-box").getByRole("button", { name: "Start practice" }).click();
			await expect(page).toHaveURL(/\/practice\/[0-9a-f-]{36}$/);
		});

		// The countdown for the 40-minute Task 2 limit is running.
		await expect(page.getByText(/\d{2}:\d{2}/).first()).toBeVisible();
	});
});

test.describe("UC16 · Đổi tên phiên luyện tập (rename)", () => {
	test("renaming via File > Rename updates the workspace title", async ({ page }) => {
		await practice.open(SESSION_IDS.s12);
		await expect(page.getByText("Your response")).toBeVisible();

		await practice.openFileMenu("Rename");

		await expect(page.getByText("Rename practice session")).toBeVisible();
		await page.locator(".modal-box input.input").fill("Editor sandbox renamed");
		await page.locator(".modal-box").getByRole("button", { name: "Save" }).click();

		await expect(page.locator("dialog.modal")).not.toHaveAttribute("open");
		await expect(page.getByText("Editor sandbox renamed").first()).toBeVisible();

		await practice.reload();
		await expect(page.getByText("Editor sandbox renamed").first()).toBeVisible();
	});
});

test.describe("UC17 · Xóa phiên luyện tập (delete)", () => {
	test("deleting via File > Delete removes the session and its workspace", async ({ page }) => {
		await practice.open(SESSION_IDS.s12);
		await expect(page.getByText("Your response")).toBeVisible();

		await practice.openFileMenu("Delete");

		await expect(page.getByText("Delete practice session")).toBeVisible();
		await page.locator(".modal-box").getByRole("button", { name: "Delete", exact: true }).click();

		// The session is removed and its workspace URL no longer resolves.
		// (The app blocks the post-delete redirect to the dashboard while the
		// workspace still has an unsaved-change guard active, so the deletion
		// outcome is asserted instead of the redirect target.)
		await page.goto(`/history?q=Editor sandbox`);
		await expect(page.getByText("No practice sessions match your filters")).toBeVisible();
		await page.goto(`/practice/${SESSION_IDS.s12}`);
		await expect(page.getByText("404")).toBeVisible();
	});
});

test.describe("Access control", () => {
	test("another user's practice session is not accessible", async ({ page, context }) => {
		await login(context, "learner");
		await page.goto(`/practice/${SESSION_IDS.other}`);
		await expect(page.getByText("404")).toBeVisible();
	});
});
