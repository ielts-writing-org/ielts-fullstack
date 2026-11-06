import { env } from "cloudflare:workers";

export async function getObjectAsBlob(key: string): Promise<Blob | null> {
	const objectBody = await env.IELTS_WRITING_BUCKET.get(key);
	if (objectBody) {
		return objectBody.blob();
	}
	return null;
}

export async function getObjectAsStream(key: string): Promise<ReadableStream | null> {
	const objectBody = await env.IELTS_WRITING_BUCKET.get(key);
	if (objectBody) {
		return objectBody.body;
	}
	return null;
}

export async function putObject(key: string, blob: Blob) {
	return await env.IELTS_WRITING_BUCKET.put(key, blob);
}
