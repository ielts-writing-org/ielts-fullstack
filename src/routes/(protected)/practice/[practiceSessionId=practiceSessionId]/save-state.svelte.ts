import { debounce } from "#lib/utils/debounce.ts";
import type { SaveState } from "#lib/domain/save-state.ts";

/**
 * Auto-save state machine behind both editors: saved -> unsaved (typing) ->
 * saving (after the debounce) -> saved, with failed -> retry via saveNow.
 */
export function createEditorSaver(save: () => Promise<void>) {
	let state = $state<SaveState>("saved");
	const debouncedSave = debounce(() => void saveNow(), 5000);

	/** Records unsaved content and reschedules the autosave. */
	function scheduleSaving() {
		if (state !== "saving") {
			state = "unsaved";
		}
		debouncedSave();
	}

	/** Saves immediately. Resolves to true when the content was persisted. */
	async function saveNow(): Promise<boolean> {
		state = "saving";
		try {
			debouncedSave.cancel();
			await save();
			state = "saved";
			return true;
		} catch {
			// Keep the content dirty so it is retried by the next autosave or the
			// explicit Retry button in the status bar.
			state = "failed";
			return false;
		}
	}

	return {
		get status(): SaveState {
			return state;
		},
		scheduleSaving,
		saveNow
	};
}
