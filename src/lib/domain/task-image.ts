import { isValidUUIDv7 } from "#lib/utils/validator.ts";
import { z } from "zod";

const ALLOWED_IMAGE_EXTENSIONS = ["jpeg", "png", "webp", "avif"];
const ALLOWED_IMAGE_MIME_TYPES = ALLOWED_IMAGE_EXTENSIONS.map((value) => `image/${value}`);
const MAX_FILE_SIZE = 1 * 1024 * 1024;

export const taskImageSchema = z.file().max(MAX_FILE_SIZE).mime(ALLOWED_IMAGE_MIME_TYPES);

export function isValidTaskImageExtension(ext: string) {
	return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
}

export function isValidTaskImageName(imageName: string) {
	const [name, ext] = imageName.split(".");
	return isValidUUIDv7(name) && isValidTaskImageExtension(ext);
}

export function getAllowedImageMimeTypes() {
	return ALLOWED_IMAGE_MIME_TYPES;
}
