import { expect, test } from "@playwright/test";
import { login, resetSeedData } from "../../lib/testing/e2e-helpers";
import { DashboardPage } from "../../lib/testing/pages/dashboard-page";

/**
 * UC3 · Xem Dashboard tổng quan (dashboard overview)
 * UC4 · Đặt mục tiêu (set the target band, incl. first-login onboarding)
 * UC5 · Đổi giao diện (change the interface theme)
 */

let dashboard: DashboardPage;

test.beforeEach(async ({ page, context }) => {
	await resetSeedData();
	await login(context, "learner");
	dashboard = new DashboardPage(page);
});

test.describe("UC3 · Xem Dashboard tổng quan (dashboard overview)", () => {
	test("shows the welcome message, practice options and task library entry", async ({ page }) => {
		await dashboard.open();

		await expect(page.getByText("Welcome back, Learner.")).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "What do you want to practice today?" })
		).toBeVisible();
		await expect(page.getByRole("link", { name: "Task Library" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Start Task 1 Practice" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Start Task 2 Practice" })).toBeVisible();
	});

	test("shows activity statistics computed from the seeded sessions", async () => {
		await dashboard.open();

		await expect(dashboard.stats.getByText("Words written")).toBeVisible();
		await expect(dashboard.stats.getByText("1,330")).toBeVisible();
		await expect(dashboard.stats.getByText("Sessions this week")).toBeVisible();
		await expect(dashboard.stats.getByText("8", { exact: true })).toBeVisible();
		await expect(dashboard.stats.getByText("Day streak")).toBeVisible();
		await expect(dashboard.stats.getByText("Consecutive practice days")).toBeVisible();
		await expect(dashboard.stats.getByText("7", { exact: true })).toBeVisible();
		await expect(dashboard.stats.getByText("Total sessions")).toBeVisible();
		await expect(dashboard.stats.getByText("13", { exact: true })).toBeVisible();
	});

	test("shows recent practice sessions with a link to the complete history", async ({ page }) => {
		await dashboard.open();

		await expect(page.getByRole("heading", { name: "Recent Practice Sessions" })).toBeVisible();
		await expect(page.getByText("Task 2 opinion essay")).toBeVisible();
		await expect(page.getByText("Band 6.5")).toBeVisible();

		await page.getByRole("link", { name: "View complete history" }).click();
		await expect(page).toHaveURL(/\/history/);
	});
});

test.describe("UC4 · Đặt mục tiêu (set the target band)", () => {
	test("a first-time user gets the onboarding modal and sets a target", async ({
		page,
		context
	}) => {
		await login(context, "newcomer");
		await dashboard.open();

		// The onboarding modal opens automatically when no target is set.
		await expect(page.getByText("Welcome to IELTS Writing Practice Platform")).toBeVisible();

		await dashboard.setBandTarget(7);
		await dashboard.saveTarget();

		await expect(page.getByTitle("Change target")).toHaveText("Target Band: 7");
	});

	test("the user can change the target band from the header badge and it persists", async ({
		page
	}) => {
		await dashboard.open();
		await expect(page.getByTitle("Change target")).toHaveText("Target Band: 7.5");

		await dashboard.openTargetModal();
		await dashboard.setBandTarget(8);
		await dashboard.saveTarget();
		await expect(page.getByTitle("Change target")).toHaveText("Target Band: 8");

		// The choice persists across reloads.
		await dashboard.reload();
		await expect(page.getByTitle("Change target")).toHaveText("Target Band: 8");

		// The dashboard progress section reflects the new target.
		await expect(page.getByText("Target 8.0")).toBeVisible();
	});

	test("cancelling the target modal leaves the previous target untouched", async ({ page }) => {
		await dashboard.open();
		await expect(page.getByTitle("Change target")).toHaveText("Target Band: 7.5");

		await dashboard.openTargetModal();
		await dashboard.setBandTarget(3);
		await dashboard.confirmModal("Cancel");

		await expect(page.locator("dialog.modal")).not.toHaveAttribute("open");
		await expect(page.getByTitle("Change target")).toHaveText("Target Band: 7.5");
	});
});

test.describe("UC5 · Đổi giao diện (change the interface theme)", () => {
	test("selecting a theme applies it immediately and persists via cookie", async ({
		page,
		context
	}) => {
		await dashboard.open();

		await dashboard.openAvatarMenu();
		await page.getByRole("button", { name: "Change theme" }).first().click();
		await expect(page.getByRole("heading", { name: "Change theme" })).toBeVisible();

		await page.getByRole("combobox", { name: "Theme switcher" }).selectOption("forest");

		await expect(page.locator("html")).toHaveAttribute("data-theme", "forest");

		const themeCookie = (await context.cookies()).find((cookie) => cookie.name === "theme");
		expect(themeCookie?.value).toBe("forest");

		// The theme survives a reload.
		await dashboard.reload();
		await expect(page.locator("html")).toHaveAttribute("data-theme", "forest");
	});
});

test.describe("UC6 · Xem thống kê luyện tập (practice statistics)", () => {
	test("shows the overall band, per-criteria breakdown and band trend", async () => {
		await dashboard.open();

		await expect(
			dashboard.progress.getByText("Average band across evaluated sessions")
		).toBeVisible();

		const overall = dashboard.progress.getByRole("progressbar", { name: "Overall average band" });
		await expect(overall).toHaveAttribute("aria-valuenow", "7");
		await expect(dashboard.progress.getByText("7.0").first()).toBeVisible();

		// Per-criteria averages (task 1 = 7.0 from one evaluation, task 2 = 7.0).
		await expect(dashboard.progress.getByText("Task Achievement / Task Response")).toBeVisible();
		await expect(dashboard.progress.getByText("Coherence & Cohesion")).toBeVisible();
		await expect(dashboard.progress.getByText("Lexical Resource")).toBeVisible();
		await expect(dashboard.progress.getByText("Grammar Range & Accuracy")).toBeVisible();

		// Band trend over the last evaluated sessions: 7.5 -> 7.0 -> 6.5.
		await expect(dashboard.progress.getByText("Declining")).toBeVisible();
		await expect(dashboard.progress.getByText("last 3 evaluations")).toBeVisible();
	});
});
