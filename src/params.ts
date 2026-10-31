import { defineParams } from "@sveltejs/kit/params";

import { isValidTaskCategory } from "#lib/utils/validator.ts";
import { isValidUUIDv7 } from "#lib/utils/validator.ts";

export const params = defineParams({
	taskCategory: (param) => (isValidTaskCategory(param) ? param : undefined),
	practiceSessionId: (param) => (isValidUUIDv7(param) ? param : undefined),
	taskId: (param) => (isValidUUIDv7(param) ? param : undefined)
});
