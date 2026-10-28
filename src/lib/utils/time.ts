/**
 * Relative time formatting for UI labels.
 *
 * Produces phrases such as "Just now", "5 minutes ago", "Yesterday",
 * "3 days ago", "2 weeks ago", "4 months ago" and "in 2 hours" (future).
 *
 * Minutes and hours are based on elapsed time, while days and larger units are
 * based on calendar-day differences so that "Yesterday" matches the previous
 * calendar day instead of an arbitrary 24-hour window.
 */

const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

/**
 * Format a date as a human-friendly relative string.
 *
 * @param value The date to describe. Accepts a `Date` or a timestamp in milliseconds.
 * @param now Reference point used as "the present". Defaults to the current time.
 * @returns A relative label, or an empty string when `value` is not a valid date.
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 3 * 60 * 60 * 1000)); // "3 hours ago"
 */
export function formatRelativeTime(value: Date | number, now: Date | number = Date.now()): string {
	const date = toDate(value);
	const reference = toDate(now);

	if (Number.isNaN(date.getTime()) || Number.isNaN(reference.getTime())) {
		return "";
	}

	const difference = date.getTime() - reference.getTime();
	const isFuture = difference > 0;
	const elapsed = Math.abs(difference);

	if (elapsed < MILLISECONDS_PER_MINUTE) {
		return "Just now";
	}

	if (elapsed < MILLISECONDS_PER_HOUR) {
		return formatUnit(Math.floor(elapsed / MILLISECONDS_PER_MINUTE), "minute", isFuture);
	}

	if (elapsed < MILLISECONDS_PER_DAY) {
		return formatUnit(Math.floor(elapsed / MILLISECONDS_PER_HOUR), "hour", isFuture);
	}

	const days = Math.abs(calendarDaysBetween(date, reference));

	if (!isFuture && days <= 1) {
		return "Yesterday";
	}

	if (days < 7) {
		return formatUnit(days, "day", isFuture);
	}

	if (days < 30) {
		return formatUnit(Math.floor(days / 7), "week", isFuture);
	}

	if (days < 365) {
		return formatUnit(Math.floor(days / 30), "month", isFuture);
	}

	return formatUnit(Math.floor(days / 365), "year", isFuture);
}

function toDate(value: Date | number): Date {
	return value instanceof Date ? value : new Date(value);
}

/** Whole-day difference between two dates, ignoring time of day and DST. */
function calendarDaysBetween(date: Date, reference: Date): number {
	const start = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
	const end = Date.UTC(reference.getFullYear(), reference.getMonth(), reference.getDate());

	return Math.round((start - end) / MILLISECONDS_PER_DAY);
}

function formatUnit(count: number, unit: string, isFuture: boolean): string {
	const safeCount = Math.max(1, count);
	const label = `${safeCount} ${unit}${safeCount === 1 ? "" : "s"}`;

	return isFuture ? `in ${label}` : `${label} ago`;
}
