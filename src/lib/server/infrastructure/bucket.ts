import { env } from "cloudflare:workers";

export async function getObjectAsBlob(key: string): Promise<Blob | null> {
	const objectBody = await env.IELTS_WRITING_BUCKET.get(key);
	if (objectBody) {
		return objectBody.blob();
	}
	return null;
}
