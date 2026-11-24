import { command, form, getRequestEvent, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { isValidSubcategory } from "#lib/domain/task.ts";
import { getApiSession } from "#lib/server/auth/session.ts";
import {
	deleteOwnedTask,
	findOwnedTask,
	insertTask,
	listTaskDependantSessions,
	updateOwnedTask
} from "#lib/server/data/tasks.ts";
import { deleteTaskImage, storeTaskImage } from "#lib/server/services/task-images.ts";
import {
	createTaskInput,
	getTaskDependantsInput,
	saveTaskImageInput,
	saveTaskPromptInput,
	taskIdInput,
	updateTaskInput
} from "./task.schema.ts";

export const getTaskDependants = query(getTaskDependantsInput, async (taskId) => {
	const { locals } = getRequestEvent();
	const { user } = getApiSession(locals);

	const task = await findOwnedTask(user.id, taskId);

	if (!task) {
		error(404);
	}

	const sessions = await listTaskDependantSessions(taskId);

	return { sessions };
});

export const saveTaskPrompt = command(saveTaskPromptInput, async ({ taskId, prompt }) => {
	const { locals } = getRequestEvent();
	const { user } = getApiSession(locals);

	const saved = await updateOwnedTask(user.id, taskId, { prompt });

	if (!saved) {
		error(404);
	}

	return { success: true };
});

export const clearTaskImage = command(taskIdInput, async ({ taskId }) => {
	const { locals } = getRequestEvent();
	const { user } = getApiSession(locals);

	const task = await findOwnedTask(user.id, taskId);

	if (!task || !task.imageName) {
		error(404);
	}

	await updateOwnedTask(user.id, taskId, { imageName: null });
	await deleteTaskImage(task.imageName);

	return { success: true };
});

export const deleteTask = command(taskIdInput, async ({ taskId }) => {
	const { locals } = getRequestEvent();
	const { user } = getApiSession(locals);

	const task = await findOwnedTask(user.id, taskId);

	if (!task) {
		error(404);
	}

	await deleteOwnedTask(user.id, taskId);

	if (task.imageName) {
		await deleteTaskImage(task.imageName);
	}

	return { success: true };
});

export const createTask = form(
	createTaskInput,
	async ({ category, subcategory, prompt, image }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		if (subcategory && !isValidSubcategory(category, subcategory)) {
			error(400, "The subcategory does not belong to the selected task category.");
		}

		const [createdTask] = await insertTask({
			userId: user.id,
			category,
			subcategory: subcategory ?? null,
			prompt
		});

		if (image) {
			const imageName = await storeTaskImage(image);
			await updateOwnedTask(user.id, createdTask.id, { imageName });
		}

		return { success: true };
	}
);

export const updateTask = form(
	updateTaskInput,
	async ({ taskId, subcategory, prompt, image, removeImage }) => {
		const { locals } = getRequestEvent();
		const { user } = getApiSession(locals);

		const task = await findOwnedTask(user.id, taskId);

		if (!task) {
			error(404);
		}

		if (subcategory && !isValidSubcategory(task.category, subcategory)) {
			error(400);
		}

		if (image) {
			const imageName = await storeTaskImage(image);
			await updateOwnedTask(user.id, taskId, { prompt, subcategory, imageName });

			if (task.imageName) {
				await deleteTaskImage(task.imageName);
			}
		} else if (removeImage) {
			await updateOwnedTask(user.id, taskId, { prompt, subcategory, imageName: null });

			if (task.imageName) {
				await deleteTaskImage(task.imageName);
			}
		} else {
			await updateOwnedTask(user.id, taskId, { prompt, subcategory });
		}

		return { success: true };
	}
);

export const saveTaskImage = form(saveTaskImageInput, async ({ taskId, image }) => {
	const { locals } = getRequestEvent();
	const { user } = getApiSession(locals);

	const task = await findOwnedTask(user.id, taskId);

	if (!task) {
		error(404);
	}

	const imageName = await storeTaskImage(image);
	await updateOwnedTask(user.id, taskId, { imageName });

	if (task.imageName) {
		await deleteTaskImage(task.imageName);
	}

	return { success: true, imageName };
});
