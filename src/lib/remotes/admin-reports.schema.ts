import { z } from "zod";

export const getAdminDashboardInput = z.enum(["7", "30", "90", "365"]);

export const reportDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getAdminReportInput = z.object({ from: reportDateSchema, to: reportDateSchema });
