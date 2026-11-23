import { describe, expect, test } from "vitest";
import {
	computeDeterministicStats,
	countCharacters,
	countParagraphs,
	countSentences,
	countWords
} from "./stats";

describe("countWords()", () => {
	test.each([
		["hello", 1],
		["  hello   world  ", 2],
		["a\nb\tc", 3],
		["one, two.", 2],
		["", 0],
		["   \n\t ", 0]
	])("counts %j as %i word(s)", (text, expected) => {
		expect(countWords(text)).toBe(expected);
	});
});

describe("countCharacters()", () => {
	test.each([
		["abc", 3],
		["a b", 3],
		["a\r\nb", 2],
		["line1\nline2", 10],
		["", 0]
	])("counts %j as %i character(s)", (text, expected) => {
		expect(countCharacters(text)).toBe(expected);
	});
});

describe("countSentences()", () => {
	test.each([
		["One sentence.", 1],
		["One. Two!", 2],
		["Really? Yes!", 2],
		["Wait... what?", 2],
		["Question? Exclamation! Statement.", 3],
		["No punctuation", 1],
		["", 0],
		["   ", 0]
	])("counts %j as %i sentence(s)", (text, expected) => {
		expect(countSentences(text)).toBe(expected);
	});
});

describe("countParagraphs()", () => {
	test.each([
		["one", 1],
		["first\nsecond", 2],
		["first\n\nsecond", 2],
		["first\n   \nsecond", 2],
		["first\r\nsecond", 2],
		["", 0],
		["   \n  ", 0]
	])("counts %j as %i paragraph(s)", (text, expected) => {
		expect(countParagraphs(text)).toBe(expected);
	});
});

describe("computeDeterministicStats()", () => {
	test("empty text", () => {
		const stats = computeDeterministicStats("");

		expect(stats).toEqual({
			words: 0,
			sentences: 0,
			characters: 0,
			paragraphs: 0
		});
	});

	test("normal text", () => {
		const text = `This is a test. This is only a test.
This is the second paragraph.`;

		const stats = computeDeterministicStats(text);

		expect.soft(stats.words).toBe(14);
		expect.soft(stats.sentences).toBe(3);
		expect.soft(stats.characters).toBe(65);
		expect.soft(stats.paragraphs).toBe(2);
	});

	test("2 newline characters", () => {
		const text = `This is a test. This is only a test.
    
This is the second paragraph.`;

		const stats = computeDeterministicStats(text);

		expect.soft(stats.words).toBe(14);
		expect.soft(stats.sentences).toBe(3);
		expect.soft(stats.characters).toBe(69);
		expect.soft(stats.paragraphs).toBe(2);
	});

	test("treats null and undefined as empty text", () => {
		const empty = { words: 0, sentences: 0, characters: 0, paragraphs: 0 };

		expect(computeDeterministicStats(null)).toEqual(empty);
		expect(computeDeterministicStats(undefined)).toEqual(empty);
	});
});
