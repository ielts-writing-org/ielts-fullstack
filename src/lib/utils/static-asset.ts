import { asset } from "$app/paths";

export async function getStaticAssetAsText(file: Parameters<typeof asset>[0]): Promise<string> {
	const req = await fetch(asset(file));
	return req.text();
}
