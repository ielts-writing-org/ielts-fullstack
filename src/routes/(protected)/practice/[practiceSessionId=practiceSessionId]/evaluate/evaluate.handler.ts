import type { EvaluateRequest } from "#lib/schemas/evaluate-request.ts";
import type { EvaluateRequestWithStats, EvaluationClient } from "./evaluation-client.port";
import type { BucketClient } from "#lib/server/infrastructure/bucket-client/bucket-client.port.ts";
import type { ImagesClient } from "#lib/server/infrastructure/images-client/images-client.port.ts";
import { computeDeterministicStats } from "#lib/utils/stats.ts";

type EvaluateHandlerReturn =
	{ success: true; stream: ReadableStream } | { success: false; message: string };

export class EvaluateHandler {
	constructor(
		private readonly evaluationClient: EvaluationClient,
		private readonly bucketClient: BucketClient,
		private readonly imagesClient: ImagesClient
	) {}

	async execute(
		validatedJson: EvaluateRequest,
		signal: AbortSignal
	): Promise<EvaluateHandlerReturn> {
		const { task, practiceSession } = validatedJson;

		let evaluationRequest: EvaluateRequestWithStats;

		if (task.category === "1") {
			const image = await this.bucketClient.getAsBlob(task.imageName);

			if (!image) {
				return { success: false, message: "Task image is missing." };
			}

			evaluationRequest = {
				task: {
					...task,
					image: await this.imagesClient.compress(image)
				},
				practiceSession: {
					...practiceSession,
					stats: computeDeterministicStats(practiceSession.response)
				}
			};
		} else {
			evaluationRequest = {
				task: task,
				practiceSession: {
					...practiceSession,
					stats: computeDeterministicStats(practiceSession.response)
				}
			};
		}

		const stream = await this.evaluationClient.execute(task.category, evaluationRequest, signal);

		return { success: true, stream };
	}
}
