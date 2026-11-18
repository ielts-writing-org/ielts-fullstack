export function createMockString(length: number) {
	return Array.from({ length }, (_, i) => `word${i}`).join(" ");
}
