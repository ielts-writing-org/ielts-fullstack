import { debounce } from "#lib/utils/debounce.ts";

type SavePhase = "Not saved" | "Saved" | "Saving" | "Failed";

/** Autosave lifecycle shared by the practice editors: a debounced autosave
 *  2s behind the last keystroke, an explicit saveNow for Ctrl+S / the toolbar
 *  button, and the save status surfaced in the editor status bar. */
export class EditorSaver {
	current = $state<SavePhase>("Saved");
	#save: () => Promise<void>;
	#debouncedSave: () => void;

	constructor(save: () => Promise<void>) {
		this.#save = save;
		this.#debouncedSave = debounce(() => void this.saveNow(), 5000);
	}

	/** Save state surfaced in the editor status bar. */
	get status(): "unsaved" | "saving" | "saved" | "failed" {
		return this.current === "Not saved"
			? "unsaved"
			: this.current === "Saving"
				? "saving"
				: this.current === "Saved"
					? "saved"
					: "failed";
	}

	/** Records unsaved content and reschedules the autosave. */
	scheduleSaving() {
		if (this.current !== "Saving") {
			this.current = "Not saved";
		}
		this.#debouncedSave();
	}

	/** Saves immediately. Resolves to true when the content was persisted. */
	async saveNow(): Promise<boolean> {
		this.current = "Saving";
		try {
			await this.#save();
			this.current = "Saved";
			return true;
		} catch {
			// Keep the content dirty so it is retried by the next autosave or the
			// explicit Retry button in the status bar.
			this.current = "Failed";
			return false;
		}
	}
}
