import { resetSeedData } from "./e2e-helpers";

/**
 * Playwright global setup. Playwright starts the webServer (build +
 * preview:e2e) before running this, so the miniflare D1 file exists and can
 * be seeded once for the whole suite. Specs whose tests mutate data re-seed
 * from test.beforeEach via resetSeedData().
 */
export default async function globalSetup(): Promise<void> {
	await resetSeedData();
}
