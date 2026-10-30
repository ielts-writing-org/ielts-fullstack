import { type ZodError, treeifyError } from "zod";

export type SerializedZodError = {
	field: string;
	message: string;
};

export function getZodErrors(zodError: ZodError): SerializedZodError[] {
	type ErrorTree = {
		errors: string[];
		properties?: Record<string, ErrorTree | undefined>;
		items?: (ErrorTree | undefined)[];
	};

	const tree: ErrorTree = treeifyError(zodError);
	const errors: SerializedZodError[] = [];

	function traverse(node: ErrorTree, path: (string | number)[] = []): void {
		for (const message of node.errors) {
			errors.push({
				field: path.length > 0 ? path.join(".") : "formError",
				message
			});
		}

		for (const [key, child] of Object.entries(node.properties ?? {})) {
			if (child) {
				traverse(child, [...path, key]);
			}
		}

		for (const [index, child] of (node.items ?? []).entries()) {
			if (child) {
				traverse(child, [...path, index]);
			}
		}
	}

	traverse(tree);

	return errors;
}
