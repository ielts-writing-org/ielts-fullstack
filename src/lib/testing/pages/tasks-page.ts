import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base-page";

/** UC30–UC38: the task library. */
export class TasksPage extends BasePage {
	readonly cards: ReturnType<Page["getByRole"]>;

	constructor(page: Page) {
		super(page);
		this.cards = page.getByRole("region", { name: "Tasks" }).getByRole("article");
	}

	async open(query = "") {
		await this.goto(query ? `/tasks?${query}` : "/tasks");
	}

	async openCardMenu(promptFragment: string) {
		await this.cards
			.filter({ hasText: promptFragment })
			.getByRole("button", { name: "Task actions" })
			.click();
	}

	async applyTaskFilter(label: "Task 1" | "Task 2") {
		await this.page
			.getByRole("group", { name: "Filter by task" })
			.getByRole("button", { name: label })
			.click();
		await expect(this.page).toHaveURL(new RegExp(`task=${label === "Task 1" ? "1" : "2"}`));
	}

	async expectShowing(count: number, total: number) {
		await expect(this.page.getByText(/Showing/).filter({ hasText: `of ${total}` })).toContainText(
			`${count}`
		);
	}

	async expectModalTitle(title: string) {
		await expect(
			this.page.locator(".modal-box").getByRole("heading", { name: title })
		).toBeVisible();
	}
}
