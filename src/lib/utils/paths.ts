import { getTaskImagePath } from "#lib/domain/task-image.ts";
import { R2_ENDPOINT } from "$app/env/public";

/** Public URL from which a stored task image is served. */
export function getTaskImageUrl(imageName: string) {
	return `${R2_ENDPOINT}/${getTaskImagePath(imageName)}` as const;
}
