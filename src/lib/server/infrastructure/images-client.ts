import { env } from "cloudflare:workers";

export class ImagesClient {
	static get instance() {
		return (ImagesClient.#instance ??= new ImagesClient(env.IELTS_WRITING_IMAGES));
	}

	static #instance: ImagesClient;

	constructor(private readonly images: ImagesBinding) {}

	async compress(image: Blob): Promise<string> {
		const imageStream = image.stream() as ReadableStream<Uint8Array>;
		const compressedImage = await this.images
			.input(imageStream)
			.transform({ width: 640 })
			.output({ format: "image/webp", quality: 70 });
		const stream = compressedImage.image({ encoding: "base64" });
		const response = new Response(stream);
		return await response.text();
	}
}
