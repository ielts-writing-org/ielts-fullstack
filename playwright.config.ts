import { defineConfig } from "@playwright/test";

export default defineConfig({
	workers: 1,
	webServer: {
		command: "npm run build && npm run preview:e2e",
		port: 5173
	},
	use: { baseURL: "http://localhost:5173/" },
	testMatch: "**/*.e2e.{ts,js}"
});
