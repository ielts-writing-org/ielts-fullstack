import { createAuthClient } from "better-auth/svelte";
import { ORIGIN } from "$app/env/public";

export const authClient = createAuthClient({
	baseURL: ORIGIN
});
