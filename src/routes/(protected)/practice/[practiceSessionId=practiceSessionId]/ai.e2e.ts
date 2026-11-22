import { expect, test } from "@playwright/test";
import {
	interceptChatStream,
	interceptEvaluateStream,
	login,
	resetSeedData
} from "../../../../lib/testing/e2e-helpers";
import { PracticePage } from "../../../../lib/testing/pages/practice-page";

/**
 * UC25 · Xem cuộc trò chuyện với AI (view the AI conversation)
 * UC26 · Trò chuyện với AI (chat with the AI)
 * UC27 · Xóa lịch sử trò chuyện với AI (clear the chat history)
 * UC28 · Xem đánh giá của AI (view the AI evaluation)
 * UC29 · Đánh giá bài viết bằng AI (evaluate an essay with the AI)
 *
 * The AI endpoints are intercepted with canned SSE responses; persistence
 * (chat messages, evaluations) runs against the real seeded database.
 */

const task1Evaluation = {
	taskCategory: "1",
	summary: "A clear visual report.",
	estimatedBand: 7,
	criteria: {
		taskAchievement: criterion(7),
		coherenceAndCohesion: criterion(7),
		lexicalResource: criterion(6.5),
		grammaticalRangeAndAccuracy: criterion(7)
	}
};

function criterion(band: number) {
	return {
		band,
		checks: [
			{ title: "Clear overview", status: "met", evidence: "The introduction frames the response." }
		],
		strengths: [{ title: "Linking", evidence: "Ideas flow with connectors." }],
		weaknesses: [],
		why: "The response addresses the task with a clear position and support.",
		nextBandGap: null
	};
}

let practice: PracticePage;

test.beforeEach(async ({ page, context }) => {
	await resetSeedData();
	await login(context, "learner");
	practice = new PracticePage(page);
});

test.describe("UC25 · Xem cuộc trò chuyện với AI (view the conversation)", () => {
	test("shows the persisted conversation with the tutor on the chat tab", async ({ page }) => {
		await practice.open("019201a1-7000-7e00-8000-000000000001");

		await page.getByRole("tab", { name: "Tab Chat" }).click();

		const bubbles = page.locator(".chat");
		await expect(bubbles).toHaveCount(2);
		await expect(bubbles.first()).toContainText("How can I improve my essay?");
		await expect(bubbles.last()).toContainText("Focus on linking words in your conclusion.");
		await expect(page.getByText("You").first()).toBeVisible();
	});
});

test.describe("UC26 · Trò chuyện với AI (chat with the AI)", () => {
	test("sending a message streams the reply and persists the conversation", async ({ page }) => {
		await interceptChatStream(page, ["Sure! ", "Try paraphrasing ", "the prompt first."]);

		await practice.open("019201a1-7000-7e00-8000-000000000001");
		await page.getByRole("tab", { name: "Tab Chat" }).click();

		await test.step("send the message", async () => {
			await page.getByPlaceholder("Ask a question...").fill("How do I write an overview?");
			await page.getByRole("button", { name: "Send" }).click();
		});

		// The streamed reply lands in an assistant bubble.
		await expect(page.locator(".chat").last()).toContainText(
			"Sure! Try paraphrasing the prompt first.",
			{
				timeout: 15_000
			}
		);
		await expect(page.locator(".chat")).toHaveCount(4);

		// The conversation is saved server-side and survives a reload.
		await practice.reload();
		await page.getByRole("tab", { name: "Tab Chat" }).click();
		await expect(page.locator(".chat")).toHaveCount(4);
	});

	test("suggestion buttons send their text as the user message", async ({ page }) => {
		await interceptChatStream(page, ["Here are some ideas."]);

		await practice.open("019201a1-7000-7e00-8000-000000000005");
		await page.getByRole("tab", { name: "Tab Chat" }).click();

		await page.getByRole("button", { name: "Give me ideas for this task" }).click();

		await expect(page.locator(".chat").first()).toContainText("Give me ideas for this task", {
			timeout: 15_000
		});
	});
});

test.describe("UC27 · Xóa lịch sử trò chuyện với AI (clear the chat history)", () => {
	test("clearing requires confirmation and empties the conversation", async ({ page }) => {
		await practice.open("019201a1-7000-7e00-8000-000000000001");
		await page.getByRole("tab", { name: "Tab Chat" }).click();
		await expect(page.locator(".chat")).toHaveCount(2);

		await page.getByRole("button", { name: "Clear conversation" }).click();
		await expect(page.getByRole("heading", { name: "Clear all messages" })).toBeVisible();

		await page.locator(".modal-box").getByRole("button", { name: "Clear", exact: true }).click();
		await expect(page.getByText("Ask the AI tutor anything")).toBeVisible();

		// The deletion is persisted.
		await practice.reload();
		await page.getByRole("tab", { name: "Tab Chat" }).click();
		await expect(page.getByText("Ask the AI tutor anything")).toBeVisible();
		await expect(page.locator(".chat")).toHaveCount(0);
	});
});

test.describe("UC28 · Xem đánh giá của AI (view the AI evaluation)", () => {
	test("shows the band, summary and criteria breakdown of the saved evaluation", async ({
		page
	}) => {
		await practice.open("019201a1-7000-7e00-8000-000000000001");

		// The evaluation tab is the default for an evaluated session.
		await expect(page.getByRole("tab", { name: "Tab Evaluation" })).toBeChecked();

		const band = page.getByRole("progressbar", { name: "Estimated band" });
		await expect(band).toHaveAttribute("aria-valuenow", "6.5");
		await expect(page.getByText("AI Evaluator")).toBeVisible();
		await expect(page.getByText("Solid essay with clear arguments.")).toBeVisible();

		// Criteria are expandable with the detailed assessment.
		await page
			.getByText(/Task Response/)
			.first()
			.click();
		await expect(
			page.getByText(/The response addresses the task with a clear position/).first()
		).toBeVisible();
	});
});

test.describe("UC29 · Đánh giá bài viết bằng AI (evaluate with the AI)", () => {
	test("evaluates a Task 1 essay with an attached chart image and persists the result", async ({
		page
	}) => {
		await interceptEvaluateStream(page, task1Evaluation);

		// s11 is a Task 1 session with an image attached and 160 words written.
		await practice.open("019201a1-7000-7e00-8000-00000000000b");

		const evaluate = page.getByRole("button", { name: "Evaluate my response" });
		await expect(evaluate).toBeEnabled();

		await test.step("request the evaluation", async () => {
			await evaluate.click();
		});

		await expect(page.getByRole("progressbar", { name: "Estimated band" })).toHaveAttribute(
			"aria-valuenow",
			"7",
			{
				timeout: 20_000
			}
		);
		await expect(page.getByText("AI Evaluator")).toBeVisible();
		await expect(page.getByText("A clear visual report.")).toBeVisible();
		await expect(page.getByRole("button", { name: "Re-evaluate" })).toBeVisible();

		// The evaluation is saved server-side and survives a reload.
		await practice.reload();
		await expect(page.getByRole("progressbar", { name: "Estimated band" })).toHaveAttribute(
			"aria-valuenow",
			"7"
		);
	});

	test("responses below the UI word range keep evaluation disabled", async ({ page }) => {
		// s3 has only 120 words (Task 2 requires 220-320 to be scorable).
		await practice.open("019201a1-7000-7e00-8000-000000000003");

		await expect(page.getByText("120 / 220")).toBeVisible();
		await expect(page.getByRole("button", { name: "Evaluate my response" })).toBeDisabled();
	});

	test("evaluates a Task 2 essay from text alone (no image required)", async ({ page }) => {
		// UC29 covers Task 1 and Task 2: Task 2 essays are scored from text
		// alone (regression test for the image requirement that used to gate
		// every category).
		await interceptEvaluateStream(page, {
			taskCategory: "2",
			summary: "Solid essay with clear arguments.",
			estimatedBand: 6.5,
			criteria: {
				taskResponse: criterion(6),
				coherenceAndCohesion: criterion(7),
				lexicalResource: criterion(6.5),
				grammaticalRangeAndAccuracy: criterion(7)
			}
		});

		// s5 is a Task 2 session with 260 words written and no evaluation yet.
		await practice.open("019201a1-7000-7e00-8000-000000000005");

		const evaluate = page.getByRole("button", { name: "Evaluate my response" });
		await expect(evaluate).toBeEnabled();
		await evaluate.click();

		await expect(page.getByRole("progressbar", { name: "Estimated band" })).toHaveAttribute(
			"aria-valuenow",
			"6.5",
			{
				timeout: 20_000
			}
		);
	});
});
