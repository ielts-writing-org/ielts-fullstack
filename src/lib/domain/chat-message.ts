import { countWords } from "#lib/utils/stats.ts";
import { z } from "zod";

const userContentSchema = z.string().superRefine((val, ctx) => {
	const [min, max] = getChatMessageAcceptableWordCount();
	const count = countWords(val);
	if (count < min || count > max) {
		ctx.addIssue(`Chat message must be between ${min} and ${max} words`);
	}
});

export const chatMessageSchema = z.discriminatedUnion("from", [
	z.object({ from: z.literal("assistant"), message: z.string() }),
	z.object({ from: z.literal("user"), message: userContentSchema })
]);

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export function getChatMessageAcceptableWordCount(): [number, number] {
	return [1, 100];
}
