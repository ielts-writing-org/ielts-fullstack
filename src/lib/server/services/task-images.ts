import { createTaskImageName, getTaskImagePath } from "#lib/domain/task-image.ts";
import { deleteObject, getObjectAsBlob, putObject } from "../bindings/bucket.ts";
import { compressImageAsBase64, compressImageAsBlob } from "../bindings/images.ts";
import { error } from "@sveltejs/kit";
import { env } from "cloudflare:workers";

/** Compresses and stores a task image, returning its generated object name. */
export async function storeTaskImage(image: Blob): Promise<string> {
	const imageName = createTaskImageName();
	const compressed = await compressImageAsBlob(image);
	await putObject(getTaskImagePath(imageName), compressed);
	return imageName;
}

/** Stores a new task image and removes the one it replaces. */
export async function replaceTaskImage(
	image: Blob,
	previousImageName: string | null
): Promise<string> {
	const imageName = await storeTaskImage(image);
	if (previousImageName) {
		await deleteTaskImage(previousImageName);
	}
	return imageName;
}

export function deleteTaskImage(imageName: string) {
	return deleteObject(getTaskImagePath(imageName));
}

export function taskImageExists(imageName: string) {
	return env.IELTS_WRITING_BUCKET.head(getTaskImagePath(imageName));
}

/**
 * Base64 data URL of a stored task image, ready for the AI providers.
 * Returns `undefined` when there is no image; a missing object is an error.
 */
export async function getTaskImageAsBase64DataUrl(imageName: string | null | undefined) {
	if (!imageName) return undefined;

	const image = await getObjectAsBlob(getTaskImagePath(imageName));
	if (!image) error(400);
	return compressImageAsBase64(image);
}
