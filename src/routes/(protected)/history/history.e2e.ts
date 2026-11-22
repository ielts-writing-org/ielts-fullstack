import { expect, test } from "@playwright/test";
import { login, resetSeedData, SESSION_IDS } from "../../../lib/testing/e2e-helpers";
import { HistoryPage } from "../../../lib/testing/pages/history-page";

/**
 * UC6 · Xem thống kê luyện tập (statistics are asserted on the dashboard spec;
 *       this page contributes the per-task bands summary)
 * UC7 · Xem lịch sử phiên luyện tập (session history list)
 * UC8 · Tìm kiếm phiên luyện tập theo từ khóa (search by keyword)
 * UC9 · Lọc danh sách phiên luyện tập (filters: task type, subcategory,
 *       evaluation status). NOTE: the list also mentions a "khoảng thời gian"
 *       (time range) filter that the app does not implement yet.
 * UC10 · Sắp xếp danh sách phiên luyện tập (sort)
 * UC11 · Sao chép phiên luyện tập (copy to clipboard)
 * UC12 · Tải phiên luyện tập dạng txt (download)
 * UC15 · Mở phiên luyện tập (open a session)
 * UC16 · Đổi tên phiên luyện tập (rename)
 * UC17 · Xóa phiên luyện tập (delete)
 *
 * Filtering happens through client-side navigation: the URL is the filter
 * contract, and a dedicated SPEC test below asserts the session list refreshes
 * in place after each filter change (no reload).
 */

const T2_PROMPT =
	"Some people believe that children should learn a foreign language at primary school, while others think it is better to begin in secondary school. Discuss both views and give your own opinion.";

/** Mirrors the seed's lorem() so clipboard/download contents can be verified. */
function lorem(count: number): string {
	return Array.from({ length: count }, (_, i) => `w${i % 97}`).join(" ");
}

let history: HistoryPage;

test.beforeEach(async ({ page, context }) => {
	await resetSeedData();
	await login(context, "learner");
	history = new HistoryPage(page);
});

test.describe("UC7 · Xem lịch sử phiên luyện tập (session history list)", () => {
	test("shows stats, trend, pagination and the first page of session cards", async ({ page }) => {
		await history.open();

		await expect(page.getByRole("heading", { name: "Practice History" })).toBeVisible();

		const stats = page.getByRole("region", { name: "Practice summary" });
		await expect(stats.getByText("Total sessions")).toBeVisible();
		await expect(stats.getByText("13", { exact: true }).first()).toBeVisible();
		await expect(stats.getByText("Evaluated")).toBeVisible();
		await expect(stats.getByText("10 awaiting evaluation")).toBeVisible();
		await expect(stats.getByText("Task 1 bands")).toBeVisible();
		await expect(stats.getByText("7.0").first()).toBeVisible();
		await expect(stats.getByText("Task 2 bands")).toBeVisible();
		await expect(stats.getByText("7.5").first()).toBeVisible();
		await expect(stats.getByText("2 sessions")).toBeVisible();

		// Trend chart over the evaluated sessions is rendered in the summary.
		await expect(
			page.getByRole("region", { name: "Progress over time" }).locator("svg").first()
		).toBeVisible();

		await history.expectShowing(5, 13);
		await expect(page.getByText("Page 1 of 3")).toBeVisible();

		await expect(history.cards).toHaveCount(5);
		await expect(history.cards.first()).toContainText("Task 2 opinion essay");
	});

	test("session cards show badges, word counts and band rings", async () => {
		await history.open();

		const firstCard = history.cards.first();
		await expect(firstCard.getByText("Task 2", { exact: true })).toBeVisible();
		await expect(firstCard.getByText("Opinion essay").first()).toBeVisible();
		await expect(firstCard.getByText("Unlimited time")).toBeVisible();
		await expect(firstCard.getByText("280 words")).toBeVisible();
		await expect(firstCard.getByRole("progressbar", { name: "Overall band" })).toHaveAttribute(
			"aria-valuenow",
			"6.5"
		);

		// A timed unevaluated session shows the timed badge and placeholder.
		const timedCard = history.card("Timed essay draft");
		await expect(timedCard.getByText("40 min limit")).toBeVisible();
		await expect(timedCard.getByText("No evaluation yet")).toBeVisible();
		await expect(timedCard.getByRole("link", { name: "Continue" })).toBeVisible();
	});

	test("pagination navigates through all pages", async ({ page }) => {
		await history.open();

		await page.getByRole("button", { name: "Next page" }).click();
		await expect(page).toHaveURL(/page=2/);
		await expect(page.getByText("Page 2 of 3")).toBeVisible();
		await history.expectShowing(5, 13);

		await page.getByRole("button", { name: "Next page" }).click();
		await expect(page).toHaveURL(/page=3/);
		await history.expectShowing(3, 13);
	});
});

test.describe("UC8 · Tìm kiếm phiên luyện tập theo từ khóa (search by keyword)", () => {
	test("searches by session name after the debounce", async ({ page }) => {
		await history.open();

		await history.search("Vocabulary");

		await history.expectShowing(1, 1);
		await expect(history.cards).toHaveCount(1);
		await expect(history.cards.first()).toContainText("Vocabulary practice");
		await expect(page.getByText('"Vocabulary"')).toBeVisible();
	});

	test("essay-body search is opt-in and finds matches inside the response", async ({ page }) => {
		await history.open();

		await test.step("searching without the essay flag finds nothing", async () => {
			// "serendipity" only appears inside one seeded essay body.
			await history.search("serendipity");
			await expect(page.getByText("No practice sessions match your filters")).toBeVisible();
		});

		await test.step("enabling the essay search finds the match", async () => {
			await page.getByText("Search in essays").click();
			await expect(page).toHaveURL(/body=1/);
			await history.reload();

			await history.expectShowing(1, 1);
			await expect(history.cards.first()).toContainText("Vocabulary practice");
		});
	});

	test("the search chip removes the query again", async ({ page }) => {
		await history.open("q=Vocabulary");
		await history.expectShowing(1, 1);

		await page.getByTitle("Remove filter").filter({ hasText: '"Vocabulary"' }).click();
		await expect(page).not.toHaveURL(/q=/);
		await history.reload();
		await history.expectShowing(5, 13);
	});
});

test.describe("UC9 · Lọc danh sách phiên luyện tập (filter the list)", () => {
	test("Task 1 shows only the seeded Task 1 sessions", async () => {
		await history.open();

		await history.applyTaskFilter("Task 1");

		await history.expectShowing(3, 3);
		await expect(history.cards).toHaveCount(3);
		for (const title of ["Task 1 line graph", "Task 1 chart analysis", "Task 1 upload sandbox"]) {
			await expect(history.card(title)).toHaveCount(1);
		}
	});

	test("Task 2 shows the Task 2 sessions", async () => {
		await history.open();

		await history.applyTaskFilter("Task 2");

		await history.expectShowing(5, 10);
	});

	test("selecting a subcategory narrows the list", async () => {
		await history.open();

		await history.selectSubcategory("Line graph", "line-graph");

		await history.expectShowing(2, 2);
		await expect(history.card("Task 1 line graph")).toHaveCount(1);
		await expect(history.card("Task 1 chart analysis")).toHaveCount(1);
	});

	test("Evaluated shows only evaluated sessions", async () => {
		await history.open();

		await history.applyStatusFilter("Evaluated");

		await history.expectShowing(3, 3);
		await expect(history.cards).toHaveCount(3);
		for (const title of [
			"Task 2 opinion essay",
			"Task 1 line graph",
			"Discussion essay practice"
		]) {
			await expect(history.card(title)).toHaveCount(1);
		}
	});

	test("Not evaluated shows the remaining sessions", async () => {
		await history.open();

		await history.applyStatusFilter("Not evaluated");

		await history.expectShowing(5, 10);
	});

	test("SPEC: filtering refreshes the session list without a reload", async ({ page }) => {
		// Per the use case spec, changing a filter must immediately show the
		// filtered list: URL, counter and cards all update in place.
		await history.open();
		await expect(history.cards).toHaveCount(5);

		await page
			.getByRole("group", { name: "Filter by task" })
			.getByRole("button", { name: "Task 1" })
			.click();

		await expect(page).toHaveURL(/task=1/);
		await expect(page.getByText("Showing 3 of 3 sessions")).toBeVisible();
		await expect(history.cards).toHaveCount(3);
		await expect(history.card("Timed essay draft")).toHaveCount(0);
	});
});

test.describe("UC10 · Sắp xếp danh sách phiên luyện tập (sort)", () => {
	test("sorting changes the order of the cards", async () => {
		await history.open();
		await expect(history.cards.first()).toContainText("Task 2 opinion essay");

		await history.sortBy("Oldest first", "oldest");
		await expect(history.cards.first()).toContainText("Overflow session 10");

		await history.sortBy("Highest band", "band");
		await expect(history.cards.first()).toContainText("Discussion essay practice");

		await history.sortBy("Most words", "words");
		await expect(history.cards.first()).toContainText("Discussion essay practice");
	});
});

test.describe("UC11 · Sao chép phiên luyện tập (copy to clipboard)", () => {
	test("copies the task prompt and the essay to the clipboard", async ({
		page,
		context,
		browserName
	}) => {
		test.skip(browserName !== "chromium", "Clipboard permissions are chromium-specific");
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);

		await history.open();
		const firstCard = history.cards.first();

		await history.openCardMenu("Task 2 opinion essay");
		await firstCard.getByRole("button", { name: "Copy essay" }).click();

		await expect(firstCard.getByRole("button", { name: "Copied!" })).toBeVisible();

		// Clipboard reads can lag the write; poll until the prompt shows up.
		await expect
			.poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 10_000 })
			.toContain(T2_PROMPT);
		const clipboard = await page.evaluate(() => navigator.clipboard.readText());
		expect(clipboard).toContain(lorem(280).slice(0, 80));
	});
});

test.describe("UC12 · Tải phiên luyện tập dạng txt (download)", () => {
	test("downloads the session with prompt and essay as a .txt file", async ({ page }) => {
		await history.open();
		const firstCard = history.cards.first();

		const downloadPromise = page.waitForEvent("download");
		await history.openCardMenu("Task 2 opinion essay");
		await firstCard.getByRole("button", { name: "Download .txt" }).click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toBe("Task-2-opinion-essay.txt");
		const path = await download.path();
		expect(path).toBeTruthy();
	});
});

test.describe("UC15 · Mở phiên luyện tập (open a session)", () => {
	test("Review opens the practice workspace with the saved response", async ({ page }) => {
		await history.open();

		await history.card("Task 2 opinion essay").getByRole("link", { name: "Review" }).click();

		await expect(page).toHaveURL(/\/practice\/[0-9a-f-]{36}$/);
		await expect(page.getByText("Your response")).toBeVisible();

		// The saved essay text is restored into the editor.
		await expect(page.locator(".harper-editor-surface").nth(1)).toContainText("w0");
		await expect(page.getByText("280 / 250 words")).toBeVisible();
	});

	test("Continue opens unevaluated sessions", async ({ page }) => {
		await history.open();

		await history.card("Timed essay draft").getByRole("link", { name: "Continue" }).click();

		await expect(page).toHaveURL(/\/practice\/[0-9a-f-]{36}$/);
		await expect(page.getByText("Your response")).toBeVisible();
	});
});

test.describe("UC16 · Đổi tên phiên luyện tập (rename)", () => {
	test("renaming updates the card and persists", async ({ page }) => {
		await history.open();

		await history.openCardMenu("Timed essay draft");
		await page.getByRole("button", { name: "Rename" }).click();

		await expect(page.getByText("Rename practice session")).toBeVisible();
		await page.getByLabel("New session name").fill("Renamed by suite");
		await page.locator(".modal-box").getByRole("button", { name: "Save" }).click();

		await expect(page.locator("dialog.modal")).not.toHaveAttribute("open", { timeout: 15_000 });

		await history.reload();
		await expect(page.getByRole("region", { name: "Practice sessions" })).toContainText(
			"Renamed by suite"
		);
	});
});

test.describe("UC17 · Xóa phiên luyện tập (delete)", () => {
	test("cancel keeps the session", async ({ page }) => {
		await history.open();

		await history.openCardMenu("Task 1 chart analysis");
		await page.getByRole("button", { name: "Delete", exact: true }).click();

		await expect(page.getByText("Delete practice session")).toBeVisible();
		await expect(page.getByText(/permanently removed/)).toBeVisible();

		await page.locator(".modal-box").getByRole("button", { name: "Cancel" }).click();
		await expect(page.locator("dialog.modal")).not.toHaveAttribute("open");
		await history.reload();
		await expect(page.getByRole("region", { name: "Practice sessions" })).toContainText(
			"Task 1 chart analysis"
		);
	});

	test("deleting removes the session from the list", async ({ page }) => {
		await history.open();

		await history.openCardMenu("Task 1 chart analysis");
		await page.getByRole("button", { name: "Delete", exact: true }).click();

		await page.locator(".modal-box").getByRole("button", { name: "Delete", exact: true }).click();
		await expect(page.locator("dialog.modal")).not.toHaveAttribute("open", { timeout: 15_000 });

		await history.reload();
		await expect(page.getByRole("region", { name: "Practice sessions" })).not.toContainText(
			"Task 1 chart analysis"
		);
		await history.expectShowing(5, 12);

		// The deleted workspace URL is gone.
		await page.goto(`/practice/${SESSION_IDS.s11}`);
		await expect(page.getByText("404")).toBeVisible();
	});
});
