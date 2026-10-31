import type { BucketClient } from "./bucket-client.port";

export class CfBucketClient implements BucketClient {
	constructor(private readonly r2Bucket: R2Bucket) {}

	async getAsBlob(key: string): Promise<Blob | null> {
		const objectBody = await this.r2Bucket.get(key);
		if (objectBody) {
			return objectBody.blob();
		}
		return null;
	}
}
