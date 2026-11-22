import { expect, type Page } from "@playwright/test";

/**
 * Base page object for E2E journeys (see https://www.sveltest.dev/docs/e2e-testing).
 * Hydration Assertion Pattern (see https://www.sveltest.dev/docs/e2e-testing#hydration-assertion-pattern).
 */
export class BasePage {
	constructor(protected readonly page: Page) {}

	async goto(path: string) {
		await this.page.goto(path);
		await this.hydrated();
	}

	async reload() {
		await this.page.reload();
		await this.hydrated();
	}

	async hydrated() {
		await expect(this.page.locator(":root")).toHaveAttribute("hydrated");
	}

	/** Clicks a button inside the currently open global modal. */
	async confirmModal(buttonText: string) {
		await this.page.locator(".modal-box").getByRole("button", { name: buttonText }).click();
	}

	/** Cancels/close the currently open global modal. */
	async cancelModal() {
		await this.confirmModal("Cancel");
		await expect(this.page.locator("dialog.modal")).not.toHaveAttribute("open");
	}
}
