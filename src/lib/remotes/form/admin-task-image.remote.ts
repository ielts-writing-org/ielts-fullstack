import { form, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { recordAdminAction, requireAdmin } from "#lib/server/auth/admin.ts";
import { tasks } from "#lib/server/db/app.schema.ts";
import { compressImageAsBlob } from "#lib/server/bindings/images.ts";
import { deleteObject, putObject } from "#lib/server/bindings/bucket.ts";
import { getImagePath } from "#lib/utils/paths.ts";

const MAX_FILE_SIZE = 1 * 1024 * 1024;

export const saveAdminTaskImage = form(
	z.object({
		taskId: z.uuidv7(),
		image: z.file().max(MAX_FILE_SIZE).mime(["image/jpeg", "image/png", "image/webp", "image/avif"]),
		published: z.enum(["true", "false"]).default("false").transform((value) => value === "true")
	}),
	async ({ taskId, image, published }) => {
		const { user, db } = await requireAdmin(getRequestEvent().locals);
		const old = await db.query.tasks.findFirst({ where: (fields, { eq }) => eq(fields.id, taskId) });
		if (!old || old.deletedAt) error(404, "Active task not found.");
		if (old.category !== "1") error(400, "Only Task 1 questions can have a chart image.");

		const imageName = `${uuidv7()}.webp`;
		const compressed = await compressImageAsBlob(image);
		await putObject(getImagePath(imageName), compressed);
		const [version] = await db
			.insert(tasks)
			.values({
				userId: old.userId,
				category: old.category,
				subcategory: old.subcategory,
				topic: old.topic,
				difficulty: old.difficulty,
				prompt: old.prompt,
				imageName,
				published
			})
			.returning({ id: tasks.id });
		try {
			const archived = await db
				.update(tasks)
				.set({ published: false, deletedAt: new Date() })
				.where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)));
			if (archived.meta.changes !== 1) {
				await db.delete(tasks).where(eq(tasks.id, version.id));
				await deleteObject(getImagePath(imageName));
				error(409, "Question changed while its image was being replaced. Reload and retry.");
			}
		} catch (cause) {
			const stillReferenced = await db.query.tasks.findFirst({
				where: (fields, { eq }) => eq(fields.id, version.id),
				columns: { id: true }
			});
			if (!stillReferenced) await deleteObject(getImagePath(imageName));
			throw cause;
		}
		await recordAdminAction(db, user.id, "task.image.replace", "task", version.id, {
			previousVersionId: taskId,
			published
		});
		return { taskId: version.id, imageName };
	}
);
