export interface ImagesClient {
	compress(image: Blob): Promise<string>;
}
