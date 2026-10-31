import type { ImagesClient } from "./images-client.port";

export class CfImagesClient implements ImagesClient {
	constructor(private readonly images: ImagesBinding) {}

	async compress(image: Blob): Promise<string> {
		const imageStream = image.stream() as ReadableStream<Uint8Array>;
		const compressedImage = await this.images
			.input(imageStream)
			.transform({ width: 640 })
			.output({ format: "image/webp", quality: 70 });
		const stream = compressedImage.image({ encoding: "base64" });
		const response = new Response(stream);
		const base64Image = await response.text();
		return `data:image/webp;base64,${base64Image}`;
	}

	async compressAsBlob(image: Blob): Promise<Blob> {
		const imageStream = image.stream() as ReadableStream<Uint8Array>;
		const compressedImage = await this.images
			.input(imageStream)
			.transform({ width: 640 })
			.output({ format: "image/webp", quality: 70 });
		const response = compressedImage.response();
		return response.blob();
	}
}
