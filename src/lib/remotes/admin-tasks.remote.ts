import { command, form, getRequestEvent, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { isValidSubcategory } from "#lib/domain/task.ts";
import { getAdminSession } from "#lib/server/auth/session.ts";
import { recordAdminAction } from "#lib/server/data/admin-audit-logs.ts";
import {
	countAdminTasks,
	createTaskVersion,
	deleteTaskById,
	findTaskById,
	insertTask,
	listAdminTasks,
	restoreTask,
	setSystemTaskPublished,
	archiveTask
} from "#lib/server/data/tasks.ts";
import {
	deleteTaskImage,
	storeTaskImage,
	taskImageExists
} from "#lib/server/services/task-images.ts";
import {
	adminTaskIdInput,
	createAdminTaskInput,
	getAdminTasksInput,
	saveAdminTaskImageInput,
	setAdminTaskVisibilityInput,
	updateAdminTaskInput
} from "./admin-tasks.schema.ts";

export const getAdminTasks = query(
	getAdminTasksInput,
	async ({ page, pageSize, search, category, source, visibility, status }) => {
		await getAdminSession(getRequestEvent().locals);
		const filters = { page, pageSize, search, category, source, visibility, status };
		const [total, tasks] = await Promise.all([countAdminTasks(filters), listAdminTasks(filters)]);
		return { tasks, page, pageSize, total };
	}
);

export const createAdminTask = command(createAdminTaskInput, async (input) => {
	const { user } = await getAdminSession(getRequestEvent().locals);
	if (input.subcategory && !isValidSubcategory(input.category, input.subcategory)) {
		error(400, "The subcategory does not belong to the selected task category.");
	}
	const [created] = await insertTask({
		userId: null,
		category: input.category,
		subcategory: input.subcategory,
		topic: input.topic,
		difficulty: input.difficulty,
		prompt: input.prompt,
		// Task 1 cannot be published until its required image has been uploaded.
		published: input.published && input.category === "2"
	});
	const published = input.published && input.category === "2";
	await recordAdminAction(user.id, "task.create", "task", created.id, {
		category: input.category,
		published
	});
	return { taskId: created.id, published };
});

export const updateAdminTask = command(updateAdminTaskInput, async ({ taskId, ...input }) => {
	const { user } = await getAdminSession(getRequestEvent().locals);
	if (input.subcategory && !isValidSubcategory(input.category, input.subcategory)) {
		error(400, "The subcategory does not belong to the selected task category.");
	}
	const old = await findTaskById(taskId);
	if (!old || old.deletedAt) error(404, "Active task not found.");
	const imageName = input.category === "1" && old.category === "1" ? old.imageName : null;
	const imageAvailable = imageName ? Boolean(await taskImageExists(imageName)) : false;
	const published = input.published && (input.category === "2" || imageAvailable);
	const [created] = await insertTask({
		userId: old.userId,
		category: input.category,
		subcategory: input.subcategory,
		topic: input.topic,
		difficulty: input.difficulty,
		prompt: input.prompt,
		imageName,
		published
	});
	const archived = await archiveTask(taskId);
	if (!archived) {
		await deleteTaskById(created.id);
		error(409, "Question changed while it was being edited. Reload and retry.");
	}
	await recordAdminAction(user.id, "task.update", "task", created.id, {
		previousVersionId: taskId,
		published
	});
	return { taskId: created.id, published, previousVersionArchived: true };
});

export const setAdminTaskVisibility = command(
	setAdminTaskVisibilityInput,
	async ({ taskId, published }) => {
		const { user } = await getAdminSession(getRequestEvent().locals);
		const task = await findTaskById(taskId);
		if (!task || task.deletedAt) error(404, "Active task not found.");
		if (task.userId !== null) error(400, "Only system tasks have public visibility.");
		if (published && task.category === "1") {
			if (!task.imageName || !(await taskImageExists(task.imageName))) {
				error(400, "Task 1 needs an available image before it can be shown.");
			}
		}
		const updated = await setSystemTaskPublished(taskId, published);
		if (!updated) {
			error(409, "Question visibility changed. Reload and try again.");
		}
		await recordAdminAction(user.id, published ? "task.publish" : "task.hide", "task", taskId);
		return { success: true };
	}
);

export const archiveAdminTask = command(adminTaskIdInput, async ({ taskId }) => {
	const { user } = await getAdminSession(getRequestEvent().locals);
	const task = await findTaskById(taskId);
	if (!task) error(404, "Task not found.");
	if (task.deletedAt) return { success: true };
	const archived = await archiveTask(taskId);
	if (!archived) error(409, "Question changed. Reload and try again.");
	await recordAdminAction(user.id, "task.archive", "task", taskId);
	return { success: true };
});

export const removeAdminTaskImage = command(adminTaskIdInput, async ({ taskId }) => {
	const { user } = await getAdminSession(getRequestEvent().locals);
	const old = await findTaskById(taskId);
	if (!old || old.deletedAt) error(404, "Active task not found.");
	if (!old.imageName) return { taskId, success: true };
	const versionId = await createTaskVersion(taskId, { imageName: null, published: false });
	if (!versionId) error(404, "Active task not found.");
	const archived = await archiveTask(taskId);
	if (!archived) {
		await deleteTaskById(versionId);
		error(409, "Question changed while its image was being removed. Reload and retry.");
	}
	await recordAdminAction(user.id, "task.image.remove", "task", versionId, {
		previousVersionId: taskId
	});
	return { taskId: versionId, success: true };
});

export const restoreAdminTask = command(adminTaskIdInput, async ({ taskId }) => {
	const { user } = await getAdminSession(getRequestEvent().locals);
	const task = await findTaskById(taskId);
	if (!task) error(404, "Task not found.");
	if (!task.deletedAt) return { success: true };
	const restored = await restoreTask(taskId, task.userId === null);
	if (!restored) {
		const latest = await findTaskById(taskId);
		if (!latest) error(404, "Task not found.");
		if (!latest.deletedAt) return { success: true };
		error(409, "Question changed. Reload and try again.");
	}
	await recordAdminAction(user.id, "task.restore", "task", taskId);
	return { success: true };
});

export const saveAdminTaskImage = form(
	saveAdminTaskImageInput,
	async ({ taskId, image, published }) => {
		const { user } = await getAdminSession(getRequestEvent().locals);
		const old = await findTaskById(taskId);
		if (!old || old.deletedAt) error(404, "Active task not found.");
		if (old.category !== "1") error(400, "Only Task 1 questions can have a chart image.");

		const imageName = await storeTaskImage(image);
		const versionId = await createTaskVersion(taskId, { imageName, published });
		if (!versionId) {
			await deleteTaskImage(imageName);
			error(404, "Active task not found.");
		}
		try {
			const archived = await archiveTask(taskId);
			if (!archived) {
				await deleteTaskById(versionId);
				await deleteTaskImage(imageName);
				error(409, "Question changed while its image was being replaced. Reload and retry.");
			}
		} catch (cause) {
			const stillReferenced = await findTaskById(versionId);
			if (!stillReferenced) await deleteTaskImage(imageName);
			throw cause;
		}
		await recordAdminAction(user.id, "task.image.replace", "task", versionId, {
			previousVersionId: taskId,
			published
		});
		return { taskId: versionId, imageName };
	}
);
