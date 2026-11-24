import { getRequestEvent, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { getAdminSession } from "#lib/server/auth/session.ts";
import { listRecentAuditLogs } from "#lib/server/data/admin-audit-logs.ts";
import {
	countEvaluationsInRange,
	getBandDistribution,
	getEvaluationDayCounts,
	getEvaluationDayTrend
} from "#lib/server/data/evaluations.ts";
import {
	countActiveUsersInRange,
	countPracticeSessionsInRange,
	getSessionDayCounts,
	getSessionDayTrend
} from "#lib/server/data/practice-sessions.ts";
import { countUsers } from "#lib/server/data/users.ts";
import {
	getAiRequestDayCounts,
	getAiRequestDayTrend,
	getAiRequestKindTotals,
	getAiRequestSummary
} from "#lib/server/data/ai-requests.ts";
import { getAdminDashboardInput, getAdminReportInput } from "./admin-reports.schema.ts";

export const getAdminDashboard = query(getAdminDashboardInput, async (days) => {
	await getAdminSession(getRequestEvent().locals);
	const from = new Date(Date.now() - Number(days) * 86_400_000);
	const [
		totalUsers,
		activeUsers,
		sessionsCount,
		evaluatedWritings,
		aiSummary,
		byKind,
		bandDistribution,
		sessionTrend,
		evaluationTrend,
		aiTrend
	] = await Promise.all([
		countUsers(),
		countActiveUsersInRange(from),
		countPracticeSessionsInRange(from),
		countEvaluationsInRange(from),
		getAiRequestSummary(from),
		getAiRequestKindTotals(from),
		getBandDistribution(from),
		getSessionDayTrend(from),
		getEvaluationDayTrend(from),
		getAiRequestDayTrend(from)
	]);
	const requestTotal = aiSummary.total;
	return {
		days: Number(days),
		totalUsers,
		activeUsers,
		sessions: sessionsCount,
		evaluatedWritings,
		requests: {
			...byKind,
			total: requestTotal,
			success: aiSummary.requestsSuccess,
			error: aiSummary.requestsError,
			errorRate:
				aiSummary.requestsError + aiSummary.requestsSuccess
					? aiSummary.requestsError / (aiSummary.requestsError + aiSummary.requestsSuccess)
					: 0,
			successRate:
				aiSummary.requestsError + aiSummary.requestsSuccess
					? aiSummary.requestsSuccess / (aiSummary.requestsError + aiSummary.requestsSuccess)
					: 0,
			averageLatencyMs: aiSummary.averageLatencyMs,
			inputTokens: aiSummary.inputTokens,
			outputTokens: aiSummary.outputTokens
		},
		bandDistribution,
		sessionTrend,
		evaluationTrend,
		aiTrend
	};
});

export const getAdminReport = query(getAdminReportInput, async ({ from, to }) => {
	await getAdminSession(getRequestEvent().locals);
	const start = new Date(`${from}T00:00:00.000Z`);
	const end = new Date(`${to}T00:00:00.000Z`);
	if (
		!Number.isFinite(start.getTime()) ||
		!Number.isFinite(end.getTime()) ||
		start.toISOString().slice(0, 10) !== from ||
		end.toISOString().slice(0, 10) !== to ||
		start > end
	) {
		error(400, "Invalid report date range.");
	}
	const dayCount = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
	if (dayCount > 366) error(400, "Reports are limited to 366 days.");
	const endExclusive = end.getTime() + 86_400_000;
	const [sessionRows, evaluationRows, aiRows] = await Promise.all([
		getSessionDayCounts(start, endExclusive),
		getEvaluationDayCounts(start, endExclusive),
		getAiRequestDayCounts(start, endExclusive)
	]);
	const sessionMap = new Map(sessionRows.map((row) => [row.day, row.sessions]));
	const evaluationMap = new Map(evaluationRows.map((row) => [row.day, row.evaluations]));
	const aiMap = new Map(aiRows.map((row) => [row.day, row]));
	const rows = Array.from({ length: dayCount }, (_, index) => {
		const day = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10);
		const ai = aiMap.get(day);
		return {
			day,
			sessions: sessionMap.get(day) ?? 0,
			evaluations: evaluationMap.get(day) ?? 0,
			grading: ai?.grading ?? 0,
			chat: ai?.chat ?? 0,
			aiErrors: ai?.errors ?? 0,
			inputTokens: ai?.inputTokens ?? 0,
			outputTokens: ai?.outputTokens ?? 0
		};
	});
	return rows;
});

export const getAdminAuditLogs = query(async () => {
	await getAdminSession(getRequestEvent().locals);
	return listRecentAuditLogs(100);
});
