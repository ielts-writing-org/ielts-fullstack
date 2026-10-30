export interface BucketClient {
	getAsBlob(key: string): Promise<Blob | null>;
}
