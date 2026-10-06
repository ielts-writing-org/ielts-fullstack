export interface TaskStats {
	words: number;
	characters: number;
	sentences: number;
	paragraphs: number;
}

export function computeDeterministicStats(text: string | null | undefined): TaskStats {
	if (!text)
		return {
			words: 0,
			sentences: 0,
			characters: 0,
			paragraphs: 0
		};

	return {
		words: countWords(text),
		sentences: countSentences(text),
		characters: countCharacters(text),
		paragraphs: countParagraphs(text)
	};
}

export function countWords(text: string): number {
	return text.split(/\s+/).filter((token) => token.length > 0).length;
}
export function countCharacters(text: string): number {
	return text.replaceAll(/[\r\n]/g, "").length;
}
export function countSentences(text: string): number {
	return text
		.split(/[.!?…]+/)
		.map((p) => p.trim())
		.filter((p) => p.length > 0).length;
}
export function countParagraphs(text: string): number {
	return text
		.split(/\n\s*/)
		.map((p) => p.trim())
		.filter((p) => p.length > 0).length;
}
