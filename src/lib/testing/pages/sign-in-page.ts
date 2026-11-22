import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "../base-page";

/**
 * UC1–UC2: GitHub sign-in (including the ban/OAuth error alternatives) and
 * sign-out. UC38–UC41: the email/password form (sign up, sign in, change
 * password) and the global modal the flows drive.
 */
export class SignInPage extends BasePage {
	/** The email/password form lives in <main>; the modal forms (reset password) do not. */
	readonly form: Locator;
	readonly emailInput: Locator;
	readonly modal: Locator;

	constructor(page: Page) {
		super(page);
		this.form = page.locator("main form.group");
		this.emailInput = this.form.getByPlaceholder("you@example.com");
		this.modal = page.locator(".modal-box");
	}

	async open() {
		await this.goto("/sign-in");
	}

	/** The protected area redirects unauthenticated visitors to the sign-in page. */
	async expectRedirectedFrom(path: string) {
		await this.page.goto(path);
		await this.page.waitForURL("**/sign-in");
		await this.hydrated();
	}

	async continueWithGitHub() {
		await this.page.getByRole("button", { name: "Continue with GitHub" }).click();
	}

	async expectErrorModal(title: string) {
		await expect(this.page.getByText(title).first()).toBeVisible();
	}

	/** Switches between the "Sign in", "Sign up" and "Change password" tabs. */
	async selectTab(tab: "Sign in" | "Sign up" | "Change password") {
		await this.page.getByRole("tab", { name: tab, exact: true }).check();
	}

	fillName(name: string) {
		return this.form.getByPlaceholder("John Doe").fill(name);
	}

	fillEmail(email: string) {
		return this.emailInput.fill(email);
	}

	/** The "Enter your password" field of the sign-in form. */
	fillSignInPassword(password: string) {
		return this.form.getByPlaceholder("Enter your password").fill(password);
	}

	/** The "Create a password" field of the sign-up form. */
	fillSignUpPassword(password: string) {
		return this.form.getByPlaceholder("Create a password").fill(password);
	}

	/** The "Re-enter your password" field of the sign-up form. */
	fillConfirmPassword(password: string) {
		return this.form.getByPlaceholder("Re-enter your password").fill(password);
	}

	/** The "Create a new password" field inside the reset-password modal. */
	fillNewPassword(password: string) {
		return this.modal.getByPlaceholder("Create a new password").fill(password);
	}

	/** The "Re-enter your new password" field inside the reset-password modal. */
	fillNewPasswordConfirm(password: string) {
		return this.modal.getByPlaceholder("Re-enter your new password").fill(password);
	}

	submitButton(label: string): Locator {
		return this.form.getByRole("button", { name: label });
	}

	async submit(label: string) {
		await this.submitButton(label).click();
	}

	async expectModalTitle(title: string) {
		await expect(this.modal.getByRole("heading")).toHaveText(title);
	}

	async closeModal() {
		await this.modal.getByRole("button", { name: "Close" }).click();
		await expect(this.page.locator("dialog.modal")).not.toHaveAttribute("open");
	}

	/**
	 * The submit button is disabled by HTML validity: daisyUI's
	 * `group-invalid:btn-disabled` removes pointer events while the form is
	 * :invalid (the button never receives the `disabled` attribute).
	 */
	async expectSubmitBlocked(blocked: boolean, label: string) {
		await expect
			.poll(() =>
				this.submitButton(label).evaluate(
					(el) =>
						(el as HTMLButtonElement).disabled || getComputedStyle(el).pointerEvents === "none"
				)
			)
			.toBe(blocked);
	}

	/** Shows/hides a daisyUI validator hint under a form field (inline errors). */
	async expectHint(text: string, visible: boolean) {
		const hint = this.form.locator(".validator-hint").filter({ hasText: text });
		await (visible ? expect(hint).toBeVisible() : expect(hint).toBeHidden());
	}
}

/** The signed-in avatar menu (theme, target band, sign out). */
export class AvatarMenu {
	constructor(private readonly page: Page) {}

	async open() {
		await this.page.getByTitle("Open Menu").click();
	}

	async signOut() {
		await this.open();
		await this.page.getByRole("button", { name: "Sign Out" }).click();
	}
}
