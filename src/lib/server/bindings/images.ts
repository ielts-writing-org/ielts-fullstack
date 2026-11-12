import type { TaskCategory } from "#lib/domain/task-category.ts";
import { env } from "cloudflare:workers";
import { getObjectAsBlob } from "./bucket";

export async function compressImage(image: Blob): Promise<ImageTransformationResult> {
	return await env.IELTS_WRITING_IMAGES.input(image.stream())
		.transform({ width: 640 })
		.output({ format: "image/webp", quality: 70 });
}

export async function compressImageAsBase64(image: Blob): Promise<string> {
	const compressedImage = await compressImage(image);
	const stream = compressedImage.image({ encoding: "base64" });
	const response = new Response(stream);
	const base64Image = await response.text();
	return `data:image/webp;base64,${base64Image}`;
}

export async function compressImageAsBlob(image: Blob): Promise<Blob> {
	const compressedImage = await compressImage(image);
	const response = compressedImage.response();
	return response.blob();
}
export async function getTaskImageAsBlob(category: TaskCategory, name: string | null) {
	if (category !== "1" || !name) {
		return undefined;
	}

	return await getObjectAsBlob(name);
}

export async function getTaskImageAsBase64(category: TaskCategory, name: string | null) {
	const image = await getTaskImageAsBlob(category, name);
	if (!image) {
		return null;
	}

	return await compressImageAsBase64(image);
}
