import { expect, test } from "@playwright/test";
import { login, resetSeedData, SESSION_IDS } from "../../../../lib/testing/e2e-helpers";
import { PracticePage } from "../../../../lib/testing/pages/practice-page";

/**
 * UC18 · Viết bài trong trình soạn thảo (write in the editor)
 * UC19 · Thêm ảnh đề bài (add a Task 1 chart image)
 * UC20 · Thay đổi ảnh đề bài (change the image)
 * UC21 · Xóa ảnh đề bài (remove the image)
 * UC22 · Sửa lỗi chính tả (fix spelling via the suggestion popup)
 * UC23 · Xem trạng thái trình soạn thảo (editor status: problems/words/chars)
 * UC24 · Lưu phiên luyện tập thủ công (manual save via Ctrl+S / File > Save All)
 *
 * Removed from the use case list: editor lock/unlock (UC28), font switching
 * (UC30), auto-save (UC32), the assistant-bar toggle (UC34) and the help
 * modals (UC35) — their tests are gone with them.
 */

let practice: PracticePage;

test.beforeEach(async ({ page, context }) => {
	await resetSeedData();
	await login(context, "learner");
	practice = new PracticePage(page);
	await practice.open(SESSION_IDS.s12);
	await expect(page.getByText("Your response")).toBeVisible();

	// Two editors: [0] = task prompt panel, [1] = the learner's response.
	await practice.editorSurface(1).click();
});

test.describe("UC18 + UC23 · Viết bài và trạng thái trình soạn thảo (writing and status)", () => {
	test("the response editor shows the word-count placeholder for Task 2", async ({ page }) => {
		await expect(page.getByText("0 / 250 words")).toBeVisible();
	});

	test("typing updates word and character counts live", async () => {
		await practice.typeInResponse("Hello world");
		await expect(practice.responseStatusBar()).toContainText("2 / 250 words");
		await expect(practice.responseStatusBar()).toContainText("11 chars");
	});
});

test.describe("UC22 · Sửa lỗi chính tả (fix spelling)", () => {
	test("spell-check counts problems and offers a fix", async ({ page }) => {
		test.setTimeout(90_000);

		await practice.typeInResponse("This is a teh sentence.");

		// The harper linters load from a CDN; give the worker time to report.
		await expect(practice.responseStatusBar()).toContainText("1 problem", { timeout: 45_000 });

		await test.step("click the misspelled word to open the suggestion popup", async () => {
			const target = await practice.editorSurface(1).evaluate((surface) => {
				const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
				while (walker.nextNode()) {
					const node = walker.currentNode;
					const index = node.textContent?.indexOf("teh") ?? -1;
					if (index >= 0) {
						const range = document.createRange();
						range.setStart(node, index);
						range.setEnd(node, index + 3);
						const rect = range.getBoundingClientRect();
						return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
					}
				}
				return null;
			});
			expect(target).toBeTruthy();
			await page.mouse.click(target!.x, target!.y);
		});

		const replaceButton = page
			.locator("harper-render-box")
			.getByRole("button", { name: /Replace with/ })
			.first();
		await expect(replaceButton).toBeVisible({ timeout: 10_000 });
		await replaceButton.click();

		await expect(practice.editorSurface(1)).toContainText("This is a the sentence.");
		await expect(practice.responseStatusBar()).toContainText("All clear", { timeout: 15_000 });
	});
});

test.describe("UC24 · Lưu phiên luyện tập thủ công (manual save)", () => {
	test("Ctrl+S saves immediately without waiting for the debounce", async ({ page }) => {
		await practice.typeInResponse("Manual save check.");

		await page.keyboard.press("Control+s");

		await expect(practice.responseStatusBar()).toContainText("Saved", { timeout: 10_000 });

		await practice.reload();
		await expect(practice.editorSurface(1)).toContainText("Manual save check.");
	});

	test("the File menu exposes Save All for manual saving", async () => {
		await practice.typeInResponse("Menu save check.");

		await practice.openFileMenu("Save All");
		await expect(practice.responseStatusBar()).toContainText("Saved", { timeout: 10_000 });
	});
});

test.describe("UC19-21 · Ảnh đề bài (task image management, Task 1)", () => {
	// These flows depend on the Cloudflare Images binding being available in
	// the local preview (image compression happens server-side before the
	// upload is stored). When the binding is unavailable the upload fails and
	// the test documents that environment gap.
	test("adds, changes and removes a Task 1 chart image", async ({ page }) => {
		test.setTimeout(90_000);
		await practice.open(SESSION_IDS.s13);
		await expect(page.getByText("Your response")).toBeVisible();

		const imageInput = page.locator('input[type="file"]').first();

		await test.step("UC19: add the image", async () => {
			const png = Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
				"base64"
			);
			await imageInput.setInputFiles({ name: "chart.png", mimeType: "image/png", buffer: png });

			const preview = page.locator('img[alt*=".webp"]');
			await expect(preview).toBeVisible({ timeout: 30_000 });
			await expect(preview).not.toHaveAttribute("src", "");
		});

		await test.step("UC20: change the image", async () => {
			const png = Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
				"base64"
			);
			await imageInput.setInputFiles({ name: "chart2.png", mimeType: "image/png", buffer: png });
			await expect(page.getByText(/Change image/).first()).toBeVisible();
		});

		await test.step("UC21: remove the image", async () => {
			await page.getByRole("button", { name: "Remove task image" }).click();
			await expect(page.locator('img[alt*=".webp"]')).toBeHidden({ timeout: 15_000 });
			await expect(page.getByText(/Add an image/).first()).toBeVisible({ timeout: 15_000 });
		});
	});
});
