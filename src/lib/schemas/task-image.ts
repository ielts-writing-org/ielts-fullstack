import { z } from "zod";

const MAX_FILE_SIZE = 1 * 1024 * 1024;

/** A task image: at most 1MB, in a format the images binding can compress. */
export const taskImageSchema = z
	.file()
	.max(MAX_FILE_SIZE)
	.mime(["image/jpeg", "image/png", "image/webp", "image/avif"]);
