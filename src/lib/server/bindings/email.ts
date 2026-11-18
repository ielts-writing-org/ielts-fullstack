import { dev } from "$app/env";
import { SMTP_SERVER, SMTP_USER, SMTP_PASSWORD } from "$app/env/private";

export async function sendEmail(to: string, subject: string, content: string) {
	try {
		if (dev) sendEmailWithNode(to, subject, content);
		else return sendEmailWithWorkers(to, subject, content);
	} catch (err) {
		console.error("Error while sending mail:", err);
	}
}

function sendEmailWithNode(to: string, subject: string, content: string) {
	console.log(`[EMAIL] To: ${to}; Subject: ${subject}; Content: ${content}`);
}

async function sendEmailWithWorkers(to: string, subject: string, content: string) {
	const { WorkerMailer } = await import("worker-mailer");
	await WorkerMailer.send(
		{
			host: SMTP_SERVER,
			port: 587,
			credentials: {
				username: SMTP_USER,
				password: SMTP_PASSWORD
			},
			authType: "plain"
		},
		{
			from: { name: "IELTS Writing Practice Platform", email: SMTP_USER },
			to,
			subject,
			text: content
		}
	);
}
