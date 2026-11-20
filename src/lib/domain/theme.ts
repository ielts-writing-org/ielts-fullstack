const THEMES_BY_GROUP = {
	"Light theme": [
		{ name: "Light", value: "light" },
		{ name: "Winter", value: "winter" }
	],
	"Dark theme": [
		{ name: "Dark", value: "dark" },
		{ name: "Forest", value: "forest" },
		{ name: "Night", value: "night" }
	]
} as const;

const VALID_THEMES = new Set<string>(
	Object.values(THEMES_BY_GROUP).flatMap((group) => group.map((item) => item.value))
);

export type ThemeName = (typeof THEMES_BY_GROUP)[keyof typeof THEMES_BY_GROUP][number]["value"];

export function getThemesByGroupAsArray() {
	return Object.entries(THEMES_BY_GROUP);
}

export function getDefaultTheme() {
	return THEMES_BY_GROUP["Light theme"][0].value;
}

export function isValidTheme(theme: string): theme is ThemeName {
	return VALID_THEMES.has(theme);
}

export function sanitizeTheme(theme: string) {
	return isValidTheme(theme) ? theme : getDefaultTheme();
}
