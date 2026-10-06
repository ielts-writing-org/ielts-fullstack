export function debounce<T extends (...args: Parameters<T>[]) => ReturnType<T>>(
	fn: T,
	delay: number
): T & { cancel: () => void } {
	let timer: ReturnType<typeof setTimeout> | undefined;

	const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
		if (timer) clearTimeout(timer);

		timer = setTimeout(() => {
			timer = undefined;
			fn.apply(this, args);
		}, delay);
	} as T & { cancel: () => void };

	debounced.cancel = () => {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	return debounced;
}
