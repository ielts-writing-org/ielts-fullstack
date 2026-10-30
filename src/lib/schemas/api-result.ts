import type { SerializedZodError } from "#lib/utils/error.ts";

export type ApiResult<T = never> =
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: {
				type: "bad_request";
				message: string;
			};
	  }
	| {
			success: false;
			error: {
				type: "validation";
				fields: SerializedZodError[];
			};
	  };
