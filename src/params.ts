import { defineParams } from "@sveltejs/kit/params";

import { isValidTaskCategory } from "#lib/domain/task-category.ts";
import { isValidUUIDv7 } from "#lib/utils/validator.ts";
import { isValidTaskImageName } from "#lib/domain/task-image.ts";

export const params = defineParams({
	imageName: (param) => (isValidTaskImageName(param) ? param : undefined),
	practiceSessionId: (param) => (isValidUUIDv7(param) ? param : undefined),
	taskCategory: (param) => (isValidTaskCategory(param) ? param : undefined),
	taskId: (param) => (isValidUUIDv7(param) ? param : undefined)
});
