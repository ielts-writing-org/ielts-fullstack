import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base-page";

/** UC3–UC5: dashboard overview, target band and theme. */
export class DashboardPage extends BasePage {
	readonly stats = this.page.getByRole("region", { name: "Practice activity" });
	readonly progress = this.page.getByRole("complementary", { name: "Progress" });

	constructor(page: Page) {
		super(page);
	}

	async open() {
		await this.goto("/");
	}

	async openAvatarMenu() {
		await this.page.getByTitle("Open Menu").click();
		await expect(this.page.locator("#avatar-popover")).toBeVisible();
	}

	async openTargetModal() {
		await this.page.getByTitle("Change target").click();
		await expect(this.page.getByText("Change target band")).toBeVisible();
	}

	async setBandTarget(value: number) {
		await this.page.locator('.modal-box input[type="range"]').evaluate((element, target) => {
			const input = element as HTMLInputElement;
			input.value = String(target);
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}, value);
	}

	async saveTarget() {
		await this.confirmModal("Save");
		await expect(this.page.locator("dialog.modal")).not.toHaveAttribute("open");
	}
}
