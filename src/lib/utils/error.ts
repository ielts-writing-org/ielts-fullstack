import { type ZodError, flattenError } from "zod";

type GenericError = {
	title: string;
	message: string;
};

type FirstZodError = GenericError & {
	field?: string;
};

export function getGenericError(e: unknown, title: string) {
	return { title: title, message: e instanceof Error ? e.message : String(e) };
}

export function getFirstZodError(e: ZodError): FirstZodError {
	const zodErrors = flattenError(e);
	if (zodErrors.formErrors.length) {
		return {
			title: "Validation error",
			message: zodErrors.formErrors[0]
		};
	} else if (Object.entries(zodErrors.fieldErrors).length) {
		const firstFieldError = Object.entries(zodErrors.fieldErrors)[0];
		return {
			title: "Validation error",
			field: firstFieldError[0],
			message: `${firstFieldError[1]} (field: ${firstFieldError[0]})`
		};
	} else {
		return {
			title: "Validation error",
			message: "Unknown validation error"
		};
	}
}
