import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base-page";

/**
 * UC13–UC17 and UC18–UC24: the practice workspace. Two editors render on the
 * page — the task prompt panel first, the learner's response second.
 */
export class PracticePage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	async open(sessionId: string) {
		await this.goto(`/practice/${sessionId}`);
	}

	editorSurface(index: 0 | 1) {
		return this.page.locator(".harper-editor-surface").nth(index);
	}

	responseStatusBar() {
		return this.page.locator('footer[aria-label="Editor status"]').nth(1);
	}

	async typeInResponse(text: string) {
		await this.editorSurface(1).click();
		await this.page.keyboard.type(text);
	}

	async openFileMenu(itemName: string) {
		await this.page.getByRole("button", { name: "File" }).click();
		const item = this.page.getByRole("button", { name: itemName }).first();
		await expect(item).toBeVisible();
		await item.click();
	}

	/** The word-count progress in the response editor status bar. */
	async expectWordCount(current: number, target: number) {
		await expect(this.responseStatusBar()).toContainText(`${current} / ${target} words`);
	}
}
