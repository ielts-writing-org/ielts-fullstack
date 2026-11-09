import { R2_ENDPOINT } from "$app/env/public";

export function getImageUrl(imageName: string) {
	return `${R2_ENDPOINT}/${getImagePath(imageName)}`;
}

export function getImagePath(imageName: string) {
	return `images/${imageName}`;
}
