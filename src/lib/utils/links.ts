import { R2_IMAGES_PATH } from "$app/env/public";

export function getImageUrl(imageName: string) {
	return `${R2_IMAGES_PATH}/${imageName}`;
}
