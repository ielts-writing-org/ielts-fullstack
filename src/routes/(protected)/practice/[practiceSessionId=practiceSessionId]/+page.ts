import type { PageLoad } from "./$types";

export const load = (async ({ data }) => {
	let taskImage: File | undefined;
	if (data.task.image) {
		const binaryString = atob(data.task.image);
		const len = binaryString.length;
		const bytes = new Uint8Array(len);

		for (let i = 0; i < len; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		taskImage = new File([new Blob([bytes])], "compressed");
	}

	return {
		...data,
		task: {
			...data.task,
			image: taskImage
		}
	};
}) satisfies PageLoad;
