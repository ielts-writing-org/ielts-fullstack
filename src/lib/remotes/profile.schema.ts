import { z } from "zod";
import { bandSchema } from "#lib/domain/evaluation.ts";

export const saveBandTargetInput = z.object({
	bandTarget: bandSchema
});
