import { defineRelations } from "drizzle-orm";
import * as authSchema from "./auth.schema";
import * as appSchema from "./app.schema";

const schema = { ...authSchema, ...appSchema };

export const relations = defineRelations(schema, (r) => ({
	profiles: {
		user: r.one.users({
			from: r.profiles.userId,
			to: r.users.id
		})
	},
	tasks: {
		user: r.one.users({
			from: r.tasks.userId,
			to: r.users.id
		}),
		practiceSessions: r.many.practiceSessions({
			from: r.tasks.id,
			to: r.practiceSessions.taskId
		})
	},
	practiceSessions: {
		task: r.one.tasks({
			from: r.practiceSessions.taskId,
			to: r.tasks.id,
			optional: false
		}),
		evaluation: r.one.evaluations({
			from: r.practiceSessions.id,
			to: r.evaluations.practiceSessionId
		}),
		chatMessages: r.many.chatMessages({
			from: r.practiceSessions.id,
			to: r.chatMessages.practiceSessionId
		})
	},
	adminAuditLogs: {
		actor: r.one.users({
			from: r.adminAuditLogs.actorUserId,
			to: r.users.id
		})
	},
	aiRequests: {
		user: r.one.users({
			from: r.aiRequests.userId,
			to: r.users.id
		}),
		practiceSession: r.one.practiceSessions({
			from: r.aiRequests.practiceSessionId,
			to: r.practiceSessions.id
		})
	}
}));
