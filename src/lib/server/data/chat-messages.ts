import { eq } from "drizzle-orm";
import { chatMessages } from "../db/app.schema";
import { getDatabase } from "../db/index.ts";

export type NewChatMessage = {
	practiceSessionId: string;
	from: "assistant" | "user";
	message: string;
};

export function insertChatMessages(messages: NewChatMessage[]) {
	return getDatabase().insert(chatMessages).values(messages);
}

export function deleteSessionChatMessages(practiceSessionId: string) {
	return getDatabase()
		.delete(chatMessages)
		.where(eq(chatMessages.practiceSessionId, practiceSessionId));
}

export function listChatMessages(practiceSessionId: string) {
	return getDatabase().query.chatMessages.findMany({
		columns: { id: true, from: true, message: true, createdAt: true },
		where: { practiceSessionId },
		orderBy: (fields, { asc }) => asc(fields.createdAt)
	});
}
