export function roundToNearestHalf(num: number): number {
	return (Math.sign(num) * Math.round(Math.abs(num * 2))) / 2;
}
