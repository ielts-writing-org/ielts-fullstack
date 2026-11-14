const AUTH_MODES = ["sign-in", "sign-up", "change-password"] as const;
const AUTH_MODES_LABELS: Record<AuthMode, string> = {
	"sign-in": "Sign in",
	"sign-up": "Sign up",
	"change-password": "Change password"
};
const AUTH_MODES_HEADING_LABELS: Record<AuthMode, string> = {
	"sign-in": "Welcome back!",
	"sign-up": "Welcome new Learner!",
	"change-password": "Change password"
};
const AUTH_MODES_SUBHEADING_LABELS: Record<AuthMode, string> = {
	"sign-in": "Sign in to continue your IELTS writing practice",
	"sign-up": "Start your IELTS writing journey today",
	"change-password": "Provide us your registered email to continue"
};

export type AuthMode = (typeof AUTH_MODES)[number];

export function getAllAuthModes() {
	return AUTH_MODES;
}

export function getAuthModeLabel(authMode: AuthMode) {
	return AUTH_MODES_LABELS[authMode];
}

export function getAuthModeHeadingLabel(authMode: AuthMode) {
	return AUTH_MODES_HEADING_LABELS[authMode];
}

export function getAuthModeSubheadingLabel(authMode: AuthMode) {
	return AUTH_MODES_SUBHEADING_LABELS[authMode];
}
