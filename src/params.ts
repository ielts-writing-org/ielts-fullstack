import { isValidTaskId } from "#lib/utils/task-id.ts";
import { defineParams } from "@sveltejs/kit/params";

export const params = defineParams({
	taskId: (param) => {
		if (!isValidTaskId(param)) return;
		return param;
	}
});
