import { Dialect, WorkerLinter } from "harper.js";

let linters: Promise<WorkerLinter[]> | undefined;

export function getLinters(): Promise<WorkerLinter[]> {
	linters ??= createLinters().catch((error) => {
		linters = undefined;
		throw error;
	});
	return linters;
}

async function createLinters(): Promise<WorkerLinter[]> {
	// @ts-expect-error - CDN module has no bundled type declarations
	// prettier-ignore
	const { slimBinary: binary } = await import("https://cdn.jsdelivr.net/npm/harper.js@3.2.0/dist/slimBinary.js");

	const instances = [
		new WorkerLinter({ binary, dialect: Dialect.American }),
		new WorkerLinter({ binary, dialect: Dialect.British })
	];
	await Promise.all(instances.map((linter) => linter.setup()));
	return instances;
}
