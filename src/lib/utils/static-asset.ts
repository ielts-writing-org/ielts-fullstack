import { asset } from "$app/paths";

export async function getStaticAsset(file: Parameters<typeof asset>[0]): Promise<string> {
	const req = await fetch(asset(file));
	return req.text();
}
