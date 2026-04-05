import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly templateRoots = [
    path.resolve(__dirname, 'templates'),
    path.resolve(process.cwd(), 'dist/modules/mail/templates'),
    path.resolve(process.cwd(), 'src/modules/mail/templates'),
  ];

  constructor(private readonly config: AppConfigService) {
    const apiKey = this.config.getResendApiKey();
    if (!apiKey) {
      throw new InternalServerErrorException('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);
  }

  async sendVerificationOtpEmail(params: {
    to: string;
    otp: string;
    displayName?: string | null;
    expiresInMinutes: number;
  }) {
    const html = await this.renderTemplate('verification-otp.html', {
      displayName: params.displayName || 'there',
      otp: params.otp,
      expiresInMinutes: String(params.expiresInMinutes),
    });

    await this.sendMail({
      to: params.to,
      subject: 'Your Kalos verification code',
      html,
    });
  }

  queueVerificationOtpEmail(params: {
    to: string;
    otp: string;
    displayName?: string | null;
    expiresInMinutes: number;
  }) {
    setImmediate(() => {
      void this.sendVerificationOtpEmail(params).catch((error: Error) => {
        this.logger.error(
          `Queued verification email failed for ${params.to}: ${error.message}`,
        );
      });
    });
  }

  async sendRegistrationConfirmedEmail(params: {
    to: string;
    displayName?: string | null;
  }) {
    const html = await this.renderTemplate('registration-confirmed.html', {
      displayName: params.displayName || 'there',
    });

    await this.sendMail({
      to: params.to,
      subject: 'Your Kalos account is verified',
      html,
    });
  }

  queueRegistrationConfirmedEmail(params: {
    to: string;
    displayName?: string | null;
  }) {
    setImmediate(() => {
      void this.sendRegistrationConfirmedEmail(params).catch((error: Error) => {
        this.logger.error(
          `Queued registration confirmation email failed for ${params.to}: ${error.message}`,
        );
      });
    });
  }

  private async sendMail(params: {
    to: string;
    subject: string;
    html: string;
  }) {
    const from = this.config.getEmailFrom();
    if (!from) {
      throw new InternalServerErrorException('EMAIL_FROM is not configured');
    }

    const maxRetries = Math.max(1, this.config.getMailMaxRetries());
    const retryDelayMs = Math.max(50, this.config.getMailRetryDelayMs());

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        const { error } = await this.resend.emails.send({
          from,
          to: params.to,
          subject: params.subject,
          html: params.html,
        });

        if (error) {
          throw new Error(error.message);
        }
        return;
      } catch (error) {
        const message = (error as Error).message;
        this.logger.error(
          `Email send failed (attempt ${attempt}/${maxRetries}) to ${params.to}: ${message}`,
        );

        if (attempt === maxRetries) {
          throw new InternalServerErrorException('Failed to send email');
        }

        await this.sleep(retryDelayMs * attempt);
      }
    }
  }

  private async renderTemplate(
    templateName: string,
    variables: Record<string, string>,
  ) {
    const templatePath = await this.resolveTemplatePath(templateName);
    const template = await fs.readFile(templatePath, 'utf-8');

    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return variables[key] ?? '';
    });
  }

  private async resolveTemplatePath(templateName: string) {
    for (const root of this.templateRoots) {
      const candidate = path.join(root, templateName);
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        continue;
      }
    }

    throw new InternalServerErrorException(
      `Email template "${templateName}" not found`,
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
