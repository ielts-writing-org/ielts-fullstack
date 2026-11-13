const AUTH_MODES = ["sign-in", "sign-up"] as const;
const AUTH_MODES_LABELS: Record<AuthMode, string> = {
	"sign-in": "Sign in",
	"sign-up": "Sign up"
};

export type AuthMode = (typeof AUTH_MODES)[number];

export function getAllAuthModes() {
	return AUTH_MODES;
}

export function getAuthModeLabel(authMode: AuthMode) {
	return AUTH_MODES_LABELS[authMode];
}
