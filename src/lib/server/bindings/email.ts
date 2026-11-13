import { SMTP_SERVER, SMTP_USER, SMTP_PASSWORD } from "$app/env/private";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	host: SMTP_SERVER,
	port: 587,
	secure: false,
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASSWORD
	},
	tls: {
		rejectUnauthorized: false
	}
});

export async function sendEmail(to: string, subject: string, content: string) {
	try {
		const info = await transporter.sendMail({
			from: '"Support" <support@ptus04.id.vn>',
			to,
			subject,
			text: content
		});

		console.log("Message sent: %s", info.messageId);
	} catch (err) {
		console.error("Error while sending mail:", err);
	}
}
