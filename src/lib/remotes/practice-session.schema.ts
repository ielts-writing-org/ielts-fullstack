import { z } from "zod";
import { chatMessageSchema } from "#lib/domain/chat-message.ts";
import { evaluationSchema } from "#lib/domain/evaluation.ts";
import { practiceTypeSchema } from "#lib/domain/practice-session.ts";
import { taskCategorySchema } from "#lib/domain/task.ts";
import { countWords } from "#lib/domain/text-stats.ts";

export const practiceSessionIdInput = z.object({
	practiceSessionId: z.uuidv7()
});

export const createPracticeInput = z.object({
	taskCategory: taskCategorySchema,
	taskId: z.uuidv7().optional(),
	practiceSessionType: practiceTypeSchema
});

export const savePracticeResponseInput = z.object({
	practiceSessionId: z.uuidv7(),
	response: z.string()
});

export const changeSessionNameInput = z.object({
	practiceSessionId: z.uuidv7(),
	newName: z.string().refine(
		(value) => {
			const count = countWords(value);
			return count >= 1 && count <= 24;
		},
		{ error: "Practice Session Name must be between 1 and 24 words." }
	)
});

export const setTimedUpActionInput = z.object({
	practiceSessionId: z.uuidv7(),
	timedUpAction: z.enum(["stop"])
});

export const saveChatMessagesInput = z.object({
	practiceSessionId: z.uuidv7(),
	chatMessages: z.array(chatMessageSchema).length(2)
});

export const saveEvaluationInput = z.object({
	practiceSessionId: z.uuidv7(),
	evaluation: evaluationSchema
});
