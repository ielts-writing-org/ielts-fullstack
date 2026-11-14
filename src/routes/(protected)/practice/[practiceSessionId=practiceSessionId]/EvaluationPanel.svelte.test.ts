import { userEvent } from "vitest/browser";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import EvaluationPanel from "./EvaluationPanel.svelte";
import Modal, { closeModal } from "#lib/components/Modal.svelte";
import { saveEvaluation } from "#lib/remotes/command/save-evaluation.remote.ts";
import type { Evaluation } from "#lib/domain/evaluation.ts";

vi.mock("$app/state", () => ({
	page: { url: new URL("http://localhost:5173/practice/session-2") }
}));

vi.mock("#lib/remotes/command/save-evaluation.remote.ts", () => ({
	saveEvaluation: vi.fn(async () => {})
}));

/**
 * Evaluation contract: readiness checklist, the enabled/disabled evaluate
 * button, streaming the AI JSON into the panel, and persistence.
 */
function sseResponse(chunks: string[]): Response {
	const encoder = new TextEncoder();
	const frames = chunks.map(
		(content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
	);
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const frame of frames) {
				controller.enqueue(encoder.encode(frame));
			}
			controller.enqueue(encoder.encode("data: [DONE]\n\n"));
			controller.close();
		}
	});
	return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function criterion(band: number): Evaluation["criteria"]["coherenceAndCohesion"] {
	return {
		band,
		checks: [{ title: "Clear position", status: "met", evidence: "The introduction states it." }],
		strengths: [],
		weaknesses: [],
		why: "The response addresses the task.",
		nextBandGap: null
	};
}

const task1Evaluation: Evaluation = {
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

const task2Evaluation: Evaluation = {
	taskCategory: "2",
	summary: "Solid essay with clear arguments.",
	estimatedBand: 6.5,
	criteria: {
		taskResponse: criterion(6),
		coherenceAndCohesion: criterion(7),
		lexicalResource: criterion(6.5),
		grammaticalRangeAndAccuracy: criterion(7)
	}
};

function words(count: number): string {
	return Array.from({ length: count }, (_, i) => `word${i}`).join(" ");
}

type PanelContext = { category: "1" | "2"; prompt: string; response: string; imageName?: string };

let cleanups: Array<() => void> = [];

async function mount(context: PanelContext, evaluationProp?: Evaluation) {
	const modal = await render(Modal);
	cleanups.push(modal.unmount);

	const panel = await render(EvaluationPanel, {
		practiceSessionId: "session-2",
		practiceSessionContext: context,
		evaluation: evaluationProp,
		isBusy: false,
		bandTarget: null,
		onAskTutor: () => {}
	});
	cleanups.push(panel.unmount);
	return panel;
}

function evaluateButton(container: HTMLElement): HTMLButtonElement {
	return Array.from(container.querySelectorAll("button")).find((b) =>
		["Evaluate my response", "Re-evaluate", "Evaluating..."].some((label) =>
			b.textContent?.includes(label)
		)
	)!;
}

afterEach(async () => {
	while (document.querySelector<HTMLDialogElement>("dialog.modal")?.open) {
		await closeModal();
	}
	for (const unmount of cleanups) {
		unmount();
	}
	cleanups = [];
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe("EvaluationPanel", () => {
	test("shows the readiness checklist with word counts for Task 2", async () => {
		const { container } = await mount({ category: "2", prompt: words(20), response: words(3) });

		expect(container.textContent).toContain("Get your band score");
		expect(container.textContent).toContain("Write prompt between 15 and 85 words");
		expect(container.textContent).toContain("20 / 15");
		expect(container.textContent).toContain("Write response between 220 and 320 words");
		expect(container.textContent).toContain("3 / 220");

		const button = evaluateButton(container);
		expect(button.textContent).toContain("Evaluate my response");
		// Requirements are not met yet, so the button is disabled.
		expect(button.disabled).toBe(true);
	});

	test("Task 1 readiness requires the task image and disables evaluation without it", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const { container } = await mount({ category: "1", prompt: words(20), response: words(160) });

		expect(container.textContent).toContain("Attach the task image");
		expect(container.textContent).toContain("Required");
		expect(container.textContent).toContain("160 / 120");

		expect(evaluateButton(container).disabled).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("evaluates a Task 1 essay from the streamed AI JSON and persists the result", async () => {
		const json = JSON.stringify(task1Evaluation);
		const fetchMock = vi.fn(async () => sseResponse([json.slice(0, 60), json.slice(60)]));
		vi.stubGlobal("fetch", fetchMock);

		const { container } = await mount({
			category: "1",
			prompt: words(20),
			response: words(160),
			imageName: "018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b.webp"
		});

		const button = evaluateButton(container);
		expect(button.disabled).toBe(false);
		await userEvent.click(button);

		await vi.waitFor(() => expect(saveEvaluation).toHaveBeenCalledTimes(1), { timeout: 5000 });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("/practice/session-2/evaluate");
		expect(init.method).toBe("POST");

		const band = container.querySelector<HTMLElement>('[aria-label="Estimated band"]')!;
		expect(band.getAttribute("aria-valuenow")).toBe("7");
		expect(container.textContent).toContain("AI Evaluator");
		expect(container.textContent).toContain("A clear visual report.");
		expect(container.textContent).toContain("Task Achievement");
		expect(container.textContent).toContain("Coherence & Cohesion");
		expect(container.textContent).toContain("Lexical Resource");
		expect(container.textContent).toContain("Grammar Range & Accuracy");

		expect(saveEvaluation).toHaveBeenCalledWith({
			practiceSessionId: "session-2",
			evaluation: task1Evaluation
		});
		expect(evaluateButton(container).textContent).toContain("Re-evaluate");
	});

	test("renders a previously saved evaluation without calling the AI again", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const { container } = await mount(
			{ category: "2", prompt: words(20), response: words(260) },
			task2Evaluation
		);

		expect(
			container
				.querySelector<HTMLElement>('[aria-label="Estimated band"]')!
				.getAttribute("aria-valuenow")
		).toBe("6.5");
		expect(container.textContent).toContain("Solid essay with clear arguments.");
		expect(container.textContent).toContain("Re-evaluate");
		expect(container.textContent).toContain("Task Response");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("responses below the UI word range keep evaluation disabled (no request)", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const { container } = await mount({ category: "2", prompt: words(20), response: words(120) });

		const button = evaluateButton(container);
		expect(button.disabled).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("evaluates a Task 2 essay from text alone (no image required)", async () => {
		const fetchMock = vi.fn(async () => sseResponse([JSON.stringify(task2Evaluation)]));
		vi.stubGlobal("fetch", fetchMock);

		const { container } = await mount({ category: "2", prompt: words(20), response: words(260) });

		const button = evaluateButton(container);
		expect(button.disabled).toBe(false);
		await userEvent.click(button);

		await vi.waitFor(() => expect(saveEvaluation).toHaveBeenCalledTimes(1), { timeout: 5000 });
		expect(saveEvaluation).toHaveBeenCalledWith({
			practiceSessionId: "session-2",
			evaluation: task2Evaluation
		});
	});
});
