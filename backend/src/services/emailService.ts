import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';

let transporterPromise: Promise<Transporter> | null = null;
let etherealUser: string = '';

async function getTransporter(): Promise<Transporter> {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    // If configured in environment variables, use provided credentials
    if (config.ethereal.user && config.ethereal.pass) {
      console.log('📧 Using configured Ethereal credentials:', config.ethereal.user);
      etherealUser = config.ethereal.user;
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: config.ethereal.user,
          pass: config.ethereal.pass,
        },
      });
    }

    // Otherwise automatically create an Ethereal test account on the fly!
    console.log('📧 Creating fresh Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    console.log('✅ Created Ethereal Account:', testAccount.user);
    etherealUser = testAccount.user;

    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  })();

  return transporterPromise;
}

export interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  body: string;
  emailId: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
  senderUsed: string;
}

export async function sendEmailViaEthereal(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const transporter = await getTransporter();

  // Send the email via fake SMTP
  const info = await transporter.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.body,
    html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
      <h2 style="color: #4f46e5;">${params.subject}</h2>
      <p style="white-space: pre-wrap;">${params.body}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
      <small style="color: #64748b;">Sent via ReachInbox Email Job Scheduler (Ethereal Fake SMTP) • ID: ${params.emailId}</small>
    </div>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`✉️ Email sent to ${params.to}! Preview URL: ${previewUrl}`);

  return {
    messageId: info.messageId,
    previewUrl,
    senderUsed: params.from,
  };
}

export function getEtherealAccountInfo() {
  return { user: etherealUser };
}
