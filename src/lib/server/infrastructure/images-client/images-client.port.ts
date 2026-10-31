export interface ImagesClient {
	compress(image: Blob): Promise<string>;
	compressAsBlob(image: Blob): Promise<Blob>;
}
