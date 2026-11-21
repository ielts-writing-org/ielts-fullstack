export type SaveState = "unsaved" | "saving" | "saved" | "failed";

export function getSaveStateLabel(state: SaveState) {
	const labels: Record<SaveState, string> = {
		unsaved: "Unsaved",
		saved: "Saved",
		saving: "Saving",
		failed: "Failed"
	};
	return labels[state];
}
