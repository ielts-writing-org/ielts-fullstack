import { expect, type Page } from "@playwright/test";
import { BasePage } from "../base-page";

/**
 * UC6–UC12 and UC15–UC17: practice statistics, session history list, search,
 * filters, sort, copy/download and session management.
 */
export class HistoryPage extends BasePage {
	readonly cards: ReturnType<Page["getByRole"]>;

	constructor(page: Page) {
		super(page);
		this.cards = page.getByRole("region", { name: "Practice sessions" }).locator("article");
	}

	async open(query = "") {
		await this.goto(query ? `/history?${query}` : "/history");
	}

	/** The session card whose title matches, scoped to the sessions region. */
	card(title: string) {
		return this.cards.filter({ hasText: title });
	}

	async openCardMenu(title: string) {
		await this.card(title).getByRole("button", { name: "Session actions" }).click();
	}

	async search(keyword: string) {
		await this.page.getByPlaceholder("Search by name, type or prompt...").fill(keyword);
		await expect(this.page).toHaveURL(new RegExp(`q=${keyword}`));
	}

	async applyTaskFilter(label: "Task 1" | "Task 2") {
		await this.page
			.getByRole("group", { name: "Filter by task" })
			.getByRole("button", { name: label, exact: true })
			.click();
		await expect(this.page).toHaveURL(new RegExp(`task=${label === "Task 1" ? "1" : "2"}`));
	}

	async applyStatusFilter(label: "Evaluated" | "Not evaluated") {
		await this.page
			.getByRole("group", { name: "Filter by evaluation status" })
			.getByRole("button", { name: label, exact: true })
			.click();
		await expect(this.page).toHaveURL(
			new RegExp(`status=${label === "Evaluated" ? "evaluated" : "unevaluated"}`)
		);
	}

	async selectSubcategory(label: string, value: string) {
		await this.page
			.getByRole("combobox", { name: "Filter by subcategory" })
			.selectOption({ label });
		await expect(this.page).toHaveURL(new RegExp(`subcategory=${value}`));
	}

	async sortBy(label: string, value: string) {
		await this.page.getByRole("combobox", { name: "Sort sessions" }).selectOption({ label });
		await expect(this.page).toHaveURL(new RegExp(`sort=${value}`));
	}

	async expectShowing(count: number, total: number) {
		await expect(this.page.getByText(`Showing ${count} of ${total} sessions`)).toBeVisible();
	}
}
