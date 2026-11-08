export function getSaveStates() {
	return ["unsaved", "saving", "saved", "failed"] as const;
}

export type SaveState = ReturnType<typeof getSaveStates>[number];

export function getSaveStateLabel(state: SaveState) {
	const labels: Record<SaveState, string> = {
		unsaved: "Unsaved",
		saved: "Saved",
		saving: "Saving",
		failed: "Failed"
	};
	return labels[state];
}
