import { defineConfig } from "@playwright/test";

export default defineConfig({
	webServer: { command: "npm run build && npm run preview", port: 5173 },
	use: { baseURL: "http://localhost:5173/" },
	testMatch: "**/*.e2e.{ts,js}"
});
