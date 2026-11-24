import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { isValidUUIDv7 } from "#lib/utils/validator.ts";

const ALLOWED_IMAGE_EXTENSIONS = ["jpeg", "png", "webp", "avif"];
const ALLOWED_IMAGE_MIME_TYPES = ALLOWED_IMAGE_EXTENSIONS.map((value) => `image/${value}`);
const MAX_FILE_SIZE = 1 * 1024 * 1024;
const IMAGE_EXTENSION = "webp";
const IMAGE_PATH_PREFIX = "images";

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

/** Generates the object-store name for a new stored task image. */
export function createTaskImageName(): string {
	return `${uuidv7()}.${IMAGE_EXTENSION}`;
}

/** Bucket key under which a task image object is stored. */
export function getTaskImagePath(imageName: string) {
	return `${IMAGE_PATH_PREFIX}/${imageName}` as const;
}
