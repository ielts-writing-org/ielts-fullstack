import { Dialect, WorkerLinter } from "harper.js";

const linters: WorkerLinter[] = [];

export async function getLinters() {
	if (linters.length !== 0) {
		return linters;
	}

	// @ts-expect-error - CDN module has no bundled type declarations
	// prettier-ignore
	const { slimBinary: binary } = await import("https://cdn.jsdelivr.net/npm/harper.js@3.0.0/dist/slimBinary.js");
	linters.push(new WorkerLinter({ binary, dialect: Dialect.American }));
	linters.push(new WorkerLinter({ binary, dialect: Dialect.British }));
	await Promise.all(linters.map((l) => l.setup()));

	return linters;
}
