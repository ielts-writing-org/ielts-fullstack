import { expect, test, type BrowserContext } from "@playwright/test";
import {
	BASE_URL,
	clickModalButton,
	createEmailVerificationJwt,
	EMAIL_PASSWORD,
	login,
	queryD1,
	resetSeedData,
	type TestUser
} from "../lib/testing/e2e-helpers";
import { AvatarMenu, SignInPage } from "../lib/testing/pages/sign-in-page";

/**
 * UC1 · Đăng nhập bằng GitHub (sign in with GitHub)
 * UC2 · Đăng xuất (sign out)
 * UC38 · Đăng ký bằng thư điện tử và mật khẩu (sign up with email and password)
 * UC39 · Đăng nhập bằng thư điện tử và mật khẩu (sign in with email and password)
 * UC40 · Đặt lại mật khẩu qua thư điện tử (reset password via email)
 * UC41 · Xác minh thư điện tử (email verification)
 *
 * Cross-route journey: the sign-in page plus the dashboard avatar menu, so it
 * lives at src/routes/ per the E2E colocation guidance.
 *
 * The e2e environment never delivers email (SMTP fails silently in the
 * background), so the flows that depend on an email link are driven by
 * artifacts the server itself writes: the reset token is read from the
 * `verifications` table and the verification token is minted with the same
 * secret/payload Better Auth's server uses.
 *
 * Removed from the use case list: the platform introduction page and the
 * terms/privacy use cases — their tests are gone with them.
 */

let signIn: SignInPage;
let avatar: AvatarMenu;

async function signInAs(context: BrowserContext, user: TestUser) {
	await login(context, user);
}

test.describe("UC1 · Đăng nhập bằng GitHub (sign in with GitHub)", () => {
	test.beforeEach(async ({ page }) => {
		signIn = new SignInPage(page);
	});

	test("unauthenticated users are redirected to the sign-in page", async ({ page }) => {
		await signIn.expectRedirectedFrom("/");
		await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
	});

	test("clicking the GitHub button starts the OAuth flow at github.com", async ({ page }) => {
		test.setTimeout(20_000);
		let authorizeUrl: URL | null = null;

		await test.step("stop the browser before it leaves for GitHub", async () => {
			await page.route("https://github.com/login/oauth/authorize**", async (route) => {
				authorizeUrl = new URL(route.request().url());
				await route.fulfill({ status: 200, contentType: "text/html", body: "" });
			});
		});

		await test.step("start the sign-in", async () => {
			await signIn.open();
			await signIn.continueWithGitHub();
		});

		await test.step("the authorization request carries client id, redirect uri and state", async () => {
			await expect.poll(() => authorizeUrl, { timeout: 15_000 }).toBeTruthy();

			const url = authorizeUrl as unknown as URL;
			// If this fails with a missing client_id, GITHUB_CLIENT_ID is not set
			// in the environment and the OAuth flow cannot start at all.
			expect(url.searchParams.get("client_id")).toBeTruthy();
			expect(url.searchParams.get("redirect_uri")).toContain("/api/auth/callback/github");
			expect(url.searchParams.get("state")).toBeTruthy();
		});
	});

	test("a banned user is told the account has been banned", async ({ page }) => {
		await page.goto("/sign-in?error=BANNED_USER");
		await signIn.hydrated();

		await signIn.expectErrorModal("You have been banned");
		await expect(page.locator("dialog.modal").getByText(/ban/i).first()).toBeVisible();
	});

	test("denying GitHub access shows an access-denied message", async ({ page }) => {
		await page.goto("/sign-in?error=access_denied");
		await signIn.hydrated();

		await signIn.expectErrorModal("Access Denied");
		await expect(
			page.getByText("You have denied access to your third-party account.")
		).toBeVisible();
	});

	test("a tampered OAuth state shows a state-mismatch message", async ({ page }) => {
		await page.goto("/sign-in?error=state_mismatch");
		await signIn.hydrated();

		await signIn.expectErrorModal("State Mismatch");
	});
});

test.describe("UC2 · Đăng xuất (sign out)", () => {
	test.beforeEach(async ({ page, context }) => {
		await signInAs(context, "learner");
		avatar = new AvatarMenu(page);
		signIn = new SignInPage(page);
	});

	test("cancelling the sign-out confirmation keeps the user signed in", async ({ page }) => {
		await page.goto("/");
		await signIn.hydrated();
		await expect(page.getByText("Welcome back, Learner.")).toBeVisible();

		await avatar.signOut();
		await expect(page.getByText("Sign out confirmation")).toBeVisible();

		await page.locator(".modal-box").getByRole("button", { name: "Cancel" }).click();
		await expect(page.locator("dialog.modal")).not.toHaveAttribute("open");

		// Still authenticated: the dashboard renders again.
		await page.goto("/");
		await signIn.hydrated();
		await expect(page.getByText("Welcome back, Learner.")).toBeVisible();
	});

	test("confirming sign-out ends the session and clears the auth cookie", async ({
		page,
		context
	}) => {
		await page.goto("/");
		await signIn.hydrated();
		await expect(page.getByText("Welcome back, Learner.")).toBeVisible();

		await avatar.signOut();
		await expect(page.getByText("Sign out confirmation")).toBeVisible();
		await page.locator(".modal-box").getByRole("button", { name: "Sign out" }).click();

		await page.waitForURL("**/sign-in", { timeout: 20_000 });

		const cookies = await context.cookies();
		expect(cookies.find((cookie) => cookie.name === "better-auth.session_token")).toBeUndefined();

		// The protected area is no longer accessible.
		await signIn.expectRedirectedFrom("/");
	});
});

test.describe("UC38 · Đăng ký bằng thư điện tử và mật khẩu (sign up with email and password)", () => {
	test.beforeEach(async ({ page }) => {
		await resetSeedData();
		signIn = new SignInPage(page);
		await signIn.open();
		await signIn.selectTab("Sign up");
	});

	test("creating an account stores user, profile and credential account, then returns to the Sign in tab signed out", async ({
		page,
		context
	}) => {
		const email = "e2enewcomer@gmail.com";

		await test.step("fill the sign-up form and submit (main flow 1–2)", async () => {
			await signIn.fillName("E2E Newcomer");
			await signIn.fillEmail(email);
			await signIn.fillSignUpPassword("e2e-password-123");
			await signIn.fillConfirmPassword("e2e-password-123");
			await signIn.submit("Create account");
		});

		await test.step("the check-your-inbox dialog appears and the form returns to the Sign in tab (3–6)", async () => {
			await signIn.expectModalTitle("Email verification");
			await expect(signIn.modal.getByText("We've sent a verification link to")).toBeVisible();
			await expect(signIn.modal.getByText(email)).toBeVisible();

			await signIn.closeModal();
			await expect(page.getByRole("heading", { name: "Welcome back!" })).toBeVisible();
			await expect(signIn.emailInput).toHaveValue(email);
		});

		await test.step("no session was created (postcondition)", async () => {
			const cookies = await context.cookies();
			expect(cookies.find((cookie) => cookie.name === "better-auth.session_token")).toBeUndefined();
		});

		await test.step("user, profile and credential account rows exist with the email unverified", async () => {
			const users = await queryD1<{ id: string; email_verified: number }>(
				"SELECT id, email_verified FROM users WHERE email = ?",
				[email]
			);
			expect(users).toHaveLength(1);
			const userId = users[0].id;
			expect(Number(users[0].email_verified)).toBe(0);

			const profiles = await queryD1("SELECT id FROM profiles WHERE user_id = ?", [userId]);
			expect(profiles).toHaveLength(1);

			const accounts = await queryD1<{ provider_id: string }>(
				"SELECT provider_id FROM accounts WHERE user_id = ?",
				[userId]
			);
			expect(accounts.map((account) => account.provider_id)).toEqual(["credential"]);
		});
	});

	test("invalid form data is blocked before submission and creates no account (A1)", async ({
		page
	}) => {
		const email = "e2eblocked@gmail.com";
		await signIn.fillName("Blocked User");
		await signIn.fillEmail(email);

		await test.step("a password under 8 characters keeps the submit disabled", async () => {
			await signIn.fillSignUpPassword("short7x");
			await signIn.fillConfirmPassword("short7x");
			await signIn.expectSubmitBlocked(true, "Create account");
		});

		await test.step("a mismatched confirm password keeps it disabled", async () => {
			await signIn.fillSignUpPassword("e2e-password-123");
			await signIn.fillConfirmPassword("e2e-password-456");
			await signIn.expectSubmitBlocked(true, "Create account");
		});

		await test.step("matching both passwords unlocks the submit button", async () => {
			await signIn.fillConfirmPassword("e2e-password-123");
			await signIn.expectSubmitBlocked(false, "Create account");
		});

		await expect(page.locator("dialog.modal")).not.toHaveAttribute("open");
		const users = await queryD1("SELECT id FROM users WHERE email = ?", [email]);
		expect(users).toHaveLength(0);
	});

	test("a server rejection shows the Unable to sign up dialog and creates no account (A1)", async ({
		page
	}) => {
		// The browser blocks invalid data client-side, so the "Unable to sign
		// up" dialog is driven here by a deterministic server failure (the
		// real 500 path also covers the sentinel email-validation block).
		await page.route("**/api/auth/sign-up/email", (route) =>
			route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ message: "Forced sign-up failure (e2e mock)" })
			})
		);

		await signIn.fillName("Rejected User");
		await signIn.fillEmail("e2erejected@gmail.com");
		await signIn.fillSignUpPassword("e2e-password-123");
		await signIn.fillConfirmPassword("e2e-password-123");
		await signIn.submit("Create account");

		await signIn.expectModalTitle("Unable to sign up");
		await expect(signIn.modal.getByText(/Status: 500/)).toBeVisible();

		const users = await queryD1("SELECT id FROM users WHERE email = ?", ["e2erejected@gmail.com"]);
		expect(users).toHaveLength(0);
	});

	test("a duplicate email still gets the generic check-your-inbox response and creates nothing (A2)", async ({
		page,
		context
	}) => {
		await signIn.fillName("Imposter");
		await signIn.fillEmail(EMAIL_PASSWORD.gmail.email);
		await signIn.fillSignUpPassword("e2e-password-123");
		await signIn.fillConfirmPassword("e2e-password-123");
		await signIn.submit("Create account");

		await signIn.expectModalTitle("Email verification");
		await expect(signIn.modal.getByText("We've sent a verification link to")).toBeVisible();

		await signIn.closeModal();
		await expect(page.getByRole("heading", { name: "Welcome back!" })).toBeVisible();

		const cookies = await context.cookies();
		expect(cookies.find((cookie) => cookie.name === "better-auth.session_token")).toBeUndefined();

		const users = await queryD1<{ email_verified: number }>(
			"SELECT email_verified FROM users WHERE email = ?",
			[EMAIL_PASSWORD.gmail.email]
		);
		expect(users).toHaveLength(1);
		expect(Number(users[0].email_verified)).toBe(1);
	});
});

test.describe("UC39 · Đăng nhập bằng thư điện tử và mật khẩu (sign in with email and password)", () => {
	const { verified, unverified } = EMAIL_PASSWORD;

	test.beforeEach(async ({ page }) => {
		await resetSeedData();
		signIn = new SignInPage(page);
		await signIn.open();
	});

	test("signing in with valid credentials creates a session and redirects to the home page (main flow)", async ({
		page,
		context
	}) => {
		await signIn.fillEmail(verified.email);
		await signIn.fillSignInPassword(verified.password);
		await signIn.submit("Sign in");

		await page.waitForURL(`${BASE_URL}/`, { timeout: 20_000 });
		await expect(page.getByText("Welcome, Email.")).toBeVisible();

		const cookies = await context.cookies();
		expect(cookies.find((cookie) => cookie.name === "better-auth.session_token")).toBeDefined();
	});

	test("invalid input shows the hint under the field and blocks submission (A1)", async ({
		page
	}) => {
		await signIn.fillEmail("not-an-email");
		await signIn.emailInput.blur();

		await signIn.expectHint("Please enter a valid email address.", true);
		await signIn.expectSubmitBlocked(true, "Sign in");
		await expect(page.locator("dialog.modal")).not.toHaveAttribute("open");
	});

	test("wrong credentials show the Unable to sign in dialog and create no session (A2)", async ({
		context
	}) => {
		await signIn.fillEmail(verified.email);
		await signIn.fillSignInPassword("totally-wrong-password");
		await signIn.submit("Sign in");

		await signIn.expectModalTitle("Unable to sign in");
		await expect(signIn.modal.getByText(/INVALID_EMAIL_OR_PASSWORD/)).toBeVisible();

		const cookies = await context.cookies();
		expect(cookies.find((cookie) => cookie.name === "better-auth.session_token")).toBeUndefined();
	});

	test("an unverified email is rejected with EMAIL_NOT_VERIFIED and no session (A3)", async ({
		context
	}) => {
		await signIn.fillEmail(unverified.email);
		await signIn.fillSignInPassword(unverified.password);
		await signIn.submit("Sign in");

		await signIn.expectModalTitle("Unable to sign in");
		await expect(signIn.modal.getByText(/EMAIL_NOT_VERIFIED/)).toBeVisible();

		const cookies = await context.cookies();
		expect(cookies.find((cookie) => cookie.name === "better-auth.session_token")).toBeUndefined();
	});
});

test.describe("UC40 · Đặt lại mật khẩu qua thư điện tử (reset password via email)", () => {
	const { verified } = EMAIL_PASSWORD;
	const newPassword = "e2e-password-456";
	const genericResetMessage =
		"If this email exists in our system, check your email for the reset link";

	test.beforeEach(async ({ page }) => {
		await resetSeedData();
		signIn = new SignInPage(page);
		await signIn.open();
		await signIn.selectTab("Change password");
		await expect(page.getByRole("heading", { name: "Change password" })).toBeVisible();
	});

	test("requesting a reset stores a single-use token; opening the link and setting a new password revokes all sessions (main flow)", async ({
		page,
		browser
	}) => {
		test.setTimeout(120_000);

		// A second, already signed-in context proves the reset revokes every
		// existing session of the user.
		const otherContext = await browser.newContext();
		await login(otherContext, "emailpw");
		const otherPage = await otherContext.newPage();
		await otherPage.goto("/");
		await expect(otherPage.getByText("Welcome, Email.")).toBeVisible();

		await test.step("request the reset email from the Change password tab (1–7)", async () => {
			await signIn.fillEmail(verified.email);
			await signIn.submit("Send to email");

			await signIn.expectModalTitle("Change password");
			await expect(
				signIn.modal.getByText(
					"Changing your password will sign you out of all sessions across devices. Continue?"
				)
			).toBeVisible();

			await clickModalButton(page, "Continue");
			await expect(signIn.modal.getByText(genericResetMessage)).toBeVisible();
			await clickModalButton(page, "Close");
		});

		let token: string;
		await test.step("the server stored a single-use token valid for ~10 minutes (5)", async () => {
			const rows = await queryD1<{ identifier: string; expires_at: number }>(
				"SELECT identifier, expires_at FROM verifications WHERE identifier LIKE 'reset-password:%'"
			);
			expect(rows).toHaveLength(1);
			token = rows[0].identifier.slice("reset-password:".length);
			expect(rows[0].expires_at).toBeGreaterThan(Date.now());
			expect(rows[0].expires_at).toBeLessThanOrEqual(Date.now() + 11 * 60_000);
		});

		await test.step("opening the email link returns to the sign-in page with the reset form (8–10)", async () => {
			const callbackURL = encodeURIComponent(
				`${BASE_URL}/sign-in?registered-email=${verified.email}`
			);
			await page.goto(`${BASE_URL}/api/auth/reset-password/${token}?callbackURL=${callbackURL}`);
			await page.waitForURL(/registered-email=/);
			await signIn.hydrated();

			await signIn.expectModalTitle("Reset password");
			await expect(signIn.modal.getByPlaceholder("you@example.com")).toHaveValue(verified.email);
		});

		await test.step("submitting the new password succeeds (11–15)", async () => {
			await signIn.fillNewPassword(newPassword);
			await signIn.fillNewPasswordConfirm(newPassword);
			await clickModalButton(page, "Reset password");

			await signIn.expectModalTitle("Change password");
			await expect(signIn.modal.getByText("Your password was successfully changed.")).toBeVisible();
			await clickModalButton(page, "Close");
			await expect(page).toHaveURL(/registered-email=/);
		});

		await test.step("the reset token was spent (13)", async () => {
			const rows = await queryD1(
				"SELECT identifier FROM verifications WHERE identifier LIKE 'reset-password:%'"
			);
			expect(rows).toHaveLength(0);
		});

		await test.step("the old password no longer signs in", async () => {
			await signIn.fillEmail(verified.email);
			await signIn.fillSignInPassword(verified.password);
			await signIn.submit("Sign in");

			await signIn.expectModalTitle("Unable to sign in");
			await signIn.closeModal();
		});

		await test.step("the new password signs in and lands on the dashboard", async () => {
			await signIn.fillSignInPassword(newPassword);
			await signIn.submit("Sign in");

			await page.waitForURL(`${BASE_URL}/`, { timeout: 20_000 });
			await expect(page.getByText("Welcome, Email.")).toBeVisible();
		});

		await test.step("every pre-existing session was revoked (14)", async () => {
			await otherPage.goto("/");
			await otherPage.waitForURL("**/sign-in");
			await otherContext.close();
		});
	});

	test("an unknown email still gets the generic response and creates no reset token (A1)", async ({
		page
	}) => {
		await signIn.fillEmail("ghost@e2e.test");
		await signIn.submit("Send to email");

		await signIn.expectModalTitle("Change password");
		await clickModalButton(page, "Continue");

		await expect(signIn.modal.getByText(genericResetMessage)).toBeVisible();
		const rows = await queryD1(
			"SELECT identifier FROM verifications WHERE identifier LIKE 'reset-password:%'"
		);
		expect(rows).toHaveLength(0);
	});

	test("an invalid reset link redirects back with the email verification failed dialog (A2)", async ({
		page
	}) => {
		const callbackURL = encodeURIComponent(
			`${BASE_URL}/sign-in?registered-email=${verified.email}`
		);
		await page.goto(`${BASE_URL}/api/auth/reset-password/bogus-token?callbackURL=${callbackURL}`);
		await page.waitForURL(/error=INVALID_TOKEN/);
		await signIn.hydrated();

		await signIn.expectModalTitle("Email verification failed");
		await expect(
			page.getByText("The link has been expired or contains invalid token.")
		).toBeVisible();
	});

	test("an invalid token shows the Unable to reset password dialog and keeps the old password (A3)", async ({
		page
	}) => {
		await page.goto("/sign-in?token=bogus-token");
		await signIn.hydrated();

		await signIn.expectModalTitle("Reset password");
		await signIn.fillNewPassword(newPassword);
		await signIn.fillNewPasswordConfirm(newPassword);
		await clickModalButton(page, "Reset password");

		await signIn.expectModalTitle("Unable to reset password");
		await expect(
			signIn.modal.getByText(
				"The link has been expired or contains invalid token. Please try again."
			)
		).toBeVisible();
		await signIn.closeModal();

		// Nothing changed: the old password still signs in.
		await signIn.fillEmail(verified.email);
		await signIn.fillSignInPassword(verified.password);
		await signIn.submit("Sign in");

		await page.waitForURL(`${BASE_URL}/`, { timeout: 20_000 });
		await expect(page.getByText("Welcome, Email.")).toBeVisible();
	});
});

test.describe("UC41 · Xác minh thư điện tử (email verification)", () => {
	const { unverified } = EMAIL_PASSWORD;

	test.beforeEach(async ({ page }) => {
		await resetSeedData();
		signIn = new SignInPage(page);
	});

	test("a valid verification link marks the email verified, signs the user in and redirects home (main flow)", async ({
		page,
		context
	}) => {
		const token = await createEmailVerificationJwt(unverified.email, unverified.userId);

		const [before] = await queryD1<{ email_verified: number }>(
			"SELECT email_verified FROM users WHERE id = ?",
			[unverified.userId]
		);
		expect(Number(before.email_verified)).toBe(0);

		await page.goto(
			`${BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(BASE_URL)}`
		);
		await page.waitForURL(`${BASE_URL}/`, { timeout: 20_000 });
		await expect(page.getByText("Welcome, Unverified.")).toBeVisible();

		const cookies = await context.cookies();
		expect(cookies.find((cookie) => cookie.name === "better-auth.session_token")).toBeDefined();

		const [after] = await queryD1<{ email_verified: number }>(
			"SELECT email_verified FROM users WHERE id = ?",
			[unverified.userId]
		);
		expect(Number(after.email_verified)).toBe(1);
	});

	test("an invalid verification link redirects to the sign-in page with the failed dialog and creates no session (A1)", async ({
		page,
		context
	}) => {
		await page.goto(
			`${BASE_URL}/api/auth/verify-email?token=bogus-token&callbackURL=${encodeURIComponent(`${BASE_URL}/sign-in`)}`
		);
		await page.waitForURL(/error=INVALID_TOKEN/);
		await signIn.hydrated();

		await signIn.expectModalTitle("Email verification failed");
		await expect(
			page.getByText("The link has been expired or contains invalid token.")
		).toBeVisible();

		const cookies = await context.cookies();
		expect(cookies.find((cookie) => cookie.name === "better-auth.session_token")).toBeUndefined();
	});
});
