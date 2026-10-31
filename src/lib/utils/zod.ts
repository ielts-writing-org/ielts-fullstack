export const jsonString = <T>(arg: T) => {
	try {
		return typeof arg === "string" ? (JSON.parse(arg) as unknown) : arg;
	} catch {
		return arg;
	}
};
