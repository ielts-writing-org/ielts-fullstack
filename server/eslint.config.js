import js from "@eslint/js";
import honoConfig from "@hono/eslint-config";
import { defineConfig, includeIgnoreFile } from "eslint/config";
import globals from "globals";
import path from "node:path";

const gitignorePath = path.resolve(import.meta.dirname, "../.gitignore");

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{
		files: ["**/*.ts"],
		languageOptions: {
			globals: globals.node,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: path.resolve(import.meta.dirname)
			}
		},
		extends: [honoConfig],
		rules: {
			"@typescript-eslint/consistent-type-definitions": "off"
		}
	},
	{
		files: ["**/*.js"],
		extends: [js.configs.recommended]
	}
);
