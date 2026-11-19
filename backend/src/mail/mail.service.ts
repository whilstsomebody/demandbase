import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.fromEmail = this.config.get<string>('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async send(params: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY not set - skipping email to ${params.to}: "${params.subject}"`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      this.logger.error(`Failed to send email to ${params.to}: ${error.message}`);
    }
  }

  async sendVerificationEmail(to: string, verificationToken: string): Promise<void> {
    await this.send({
      to,
      subject: 'Verify your email',
      html: `<p>Your verification code is:</p><p><strong>${verificationToken}</strong></p>`,
    });
  }
}
