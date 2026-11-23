import z from "zod";

/** IELTS bands run from 0 to 9 in half-band steps. */
export const BAND_MIN = 0;
export const BAND_MAX = 9;

export const bandSchema = z.number().min(BAND_MIN).max(BAND_MAX);

/** Rounds a computed band to the nearest half band (0.5 steps). */
export function roundToNearestHalfBand(value: number): number {
	return (Math.sign(value) * Math.round(Math.abs(value * 2))) / 2;
}

/** Band position as a 0-1 fraction of the IELTS scale, clamped. */
export function getBandFraction(band: number): number {
	return Math.max(0, Math.min(1, band / BAND_MAX));
}

/** Band position as a 0-100 percentage of the IELTS scale, clamped. */
export function getBandPercentage(band: number): number {
	return getBandFraction(band) * 100;
}

/**
 * Official IELTS Writing overall band: Task 2 carries twice the weight of
 * Task 1 — (task1 + task2 * 2) / 3. When only one task has been graded, its
 * band is the overall band; with neither, 0.
 */
export function combineWritingBands(task1Band: number | null, task2Band: number | null): number {
	if (task1Band !== null && task2Band !== null) {
		return (task1Band + task2Band * 2) / 3;
	}

	return task1Band ?? task2Band ?? 0;
}
