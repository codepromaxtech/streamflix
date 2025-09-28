import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  data?: any;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface BulkEmailOptions {
  recipients: Array<{
    email: string;
    name?: string;
    data?: any;
  }>;
  template: string;
  subject: string;
  globalData?: any;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, EmailTemplate> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
    this.loadEmailTemplates();
  }

  private initializeTransporter(): void {
    const emailProvider = this.configService.get('EMAIL_PROVIDER', 'smtp');

    switch (emailProvider) {
      case 'sendgrid':
        this.transporter = nodemailer.createTransporter({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: this.configService.get('SENDGRID_API_KEY'),
          },
        });
        break;

      case 'ses':
        this.transporter = nodemailer.createTransporter({
          SES: {
            aws: {
              accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
              secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
              region: this.configService.get('AWS_REGION', 'us-east-1'),
            },
          },
        });
        break;

      case 'smtp':
      default:
        this.transporter = nodemailer.createTransporter({
          host: this.configService.get('SMTP_HOST'),
          port: this.configService.get('SMTP_PORT', 587),
          secure: this.configService.get('SMTP_SECURE', false),
          auth: {
            user: this.configService.get('SMTP_USER'),
            pass: this.configService.get('SMTP_PASS'),
          },
        });
        break;
    }

    this.logger.log(`Email service initialized with provider: ${emailProvider}`);
  }

  private loadEmailTemplates(): void {
    const templatesDir = path.join(__dirname, '../../templates/email');
    
    const defaultTemplates = [
      'welcome',
      'password-reset',
      'email-verification',
      'notification',
      'stream-started',
      'new-follower',
      'donation-received',
      'subscription-reminder',
      'newsletter',
      'payment-receipt',
    ];

    defaultTemplates.forEach(templateName => {
      try {
        const templatePath = path.join(templatesDir, `${templateName}.hbs`);
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          const compiledTemplate = handlebars.compile(templateContent);
          
          this.templates.set(templateName, {
            name: templateName,
            subject: this.getDefaultSubject(templateName),
            html: templateContent,
          });
        } else {
          // Create default template if it doesn't exist
          this.createDefaultTemplate(templateName);
        }
      } catch (error) {
        this.logger.error(`Error loading template ${templateName}:`, error);
      }
    });

    this.logger.log(`Loaded ${this.templates.size} email templates`);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      let html = options.html;
      let text = options.text;
      let subject = options.subject;

      // Use template if specified
      if (options.template) {
        const template = this.templates.get(options.template);
        if (template) {
          const compiledTemplate = handlebars.compile(template.html);
          html = compiledTemplate(options.data || {});
          subject = template.subject;
          
          // Generate text version from HTML if not provided
          if (!text) {
            text = this.htmlToText(html);
          }
        }
      }

      const mailOptions = {
        from: this.configService.get('EMAIL_FROM', 'noreply@streamflix.com'),
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject,
        html,
        text,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(`Email sent successfully to ${mailOptions.to}`);
      return true;
    } catch (error) {
      this.logger.error('Error sending email:', error);
      return false;
    }
  }

  async sendBulkEmail(options: BulkEmailOptions): Promise<{ sent: number; failed: number }> {
    const results = { sent: 0, failed: 0 };

    for (const recipient of options.recipients) {
      try {
        const success = await this.sendEmail({
          to: recipient.email,
          subject: options.subject,
          template: options.template,
          data: {
            ...options.globalData,
            ...recipient.data,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
          },
        });

        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (error) {
        this.logger.error(`Error sending bulk email to ${recipient.email}:`, error);
        results.failed++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logger.log(`Bulk email completed: ${results.sent} sent, ${results.failed} failed`);
    return results;
  }

  async sendWelcomeEmail(userEmail: string, userName: string, verificationToken?: string): Promise<boolean> {
    return this.sendEmail({
      to: userEmail,
      subject: 'Welcome to StreamFlix!',
      template: 'welcome',
      data: {
        userName,
        verificationToken,
        verificationUrl: verificationToken 
          ? `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`
          : null,
        loginUrl: `${this.configService.get('FRONTEND_URL')}/login`,
        supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
      },
    });
  }

  async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<boolean> {
    return this.sendEmail({
      to: userEmail,
      subject: 'Reset Your StreamFlix Password',
      template: 'password-reset',
      data: {
        userName,
        resetToken,
        resetUrl: `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`,
        expiryHours: 24,
      },
    });
  }

  async sendEmailVerification(userEmail: string, userName: string, verificationToken: string): Promise<boolean> {
    return this.sendEmail({
      to: userEmail,
      subject: 'Verify Your Email Address',
      template: 'email-verification',
      data: {
        userName,
        verificationToken,
        verificationUrl: `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`,
      },
    });
  }

  async sendStreamStartedNotification(
    userEmail: string,
    userName: string,
    streamerName: string,
    streamTitle: string,
    streamUrl: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to: userEmail,
      subject: `${streamerName} is now live!`,
      template: 'stream-started',
      data: {
        userName,
        streamerName,
        streamTitle,
        streamUrl: `${this.configService.get('FRONTEND_URL')}/stream/${streamUrl}`,
        unsubscribeUrl: `${this.configService.get('FRONTEND_URL')}/notifications/unsubscribe`,
      },
    });
  }

  async sendNewFollowerNotification(
    streamerEmail: string,
    streamerName: string,
    followerName: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to: streamerEmail,
      subject: 'You have a new follower!',
      template: 'new-follower',
      data: {
        streamerName,
        followerName,
        dashboardUrl: `${this.configService.get('FRONTEND_URL')}/dashboard`,
      },
    });
  }

  async sendDonationReceivedNotification(
    streamerEmail: string,
    streamerName: string,
    donorName: string,
    amount: number,
    currency: string,
    message?: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to: streamerEmail,
      subject: `You received a $${amount} donation!`,
      template: 'donation-received',
      data: {
        streamerName,
        donorName,
        amount,
        currency,
        message,
        dashboardUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/earnings`,
      },
    });
  }

  async sendSubscriptionReminder(
    userEmail: string,
    userName: string,
    planName: string,
    expiryDate: Date,
    renewalUrl: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to: userEmail,
      subject: 'Your StreamFlix subscription expires soon',
      template: 'subscription-reminder',
      data: {
        userName,
        planName,
        expiryDate: expiryDate.toLocaleDateString(),
        renewalUrl,
        daysUntilExpiry: Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      },
    });
  }

  async sendNewsletter(
    recipients: Array<{ email: string; name: string }>,
    subject: string,
    content: {
      headline: string;
      articles: Array<{
        title: string;
        summary: string;
        url: string;
        imageUrl?: string;
      }>;
      featuredStreamer?: {
        name: string;
        description: string;
        url: string;
        imageUrl?: string;
      };
    },
  ): Promise<{ sent: number; failed: number }> {
    return this.sendBulkEmail({
      recipients,
      subject,
      template: 'newsletter',
      globalData: content,
    });
  }

  async sendPaymentReceipt(
    userEmail: string,
    userName: string,
    receipt: {
      transactionId: string;
      amount: number;
      currency: string;
      description: string;
      date: Date;
      paymentMethod: string;
    },
  ): Promise<boolean> {
    return this.sendEmail({
      to: userEmail,
      subject: `Payment Receipt - ${receipt.transactionId}`,
      template: 'payment-receipt',
      data: {
        userName,
        ...receipt,
        formattedDate: receipt.date.toLocaleDateString(),
        formattedAmount: `${receipt.currency} ${receipt.amount.toFixed(2)}`,
      },
    });
  }

  async testEmailConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Email connection test failed:', error);
      return false;
    }
  }

  private getDefaultSubject(templateName: string): string {
    const subjects = {
      'welcome': 'Welcome to StreamFlix!',
      'password-reset': 'Reset Your Password',
      'email-verification': 'Verify Your Email',
      'notification': 'StreamFlix Notification',
      'stream-started': 'Stream Started',
      'new-follower': 'New Follower',
      'donation-received': 'Donation Received',
      'subscription-reminder': 'Subscription Reminder',
      'newsletter': 'StreamFlix Newsletter',
      'payment-receipt': 'Payment Receipt',
    };

    return subjects[templateName] || 'StreamFlix Notification';
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private createDefaultTemplate(templateName: string): void {
    const templates = {
      'welcome': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e50914;">Welcome to StreamFlix, {{userName}}!</h1>
          <p>Thank you for joining our streaming community. Get ready to discover amazing content and connect with creators.</p>
          {{#if verificationUrl}}
          <p>Please verify your email address by clicking the button below:</p>
          <a href="{{verificationUrl}}" style="background-color: #e50914; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
          {{/if}}
          <p>Start exploring: <a href="{{loginUrl}}">Login to StreamFlix</a></p>
          <p>Need help? Visit our <a href="{{supportUrl}}">Support Center</a></p>
        </div>
      `,
      'password-reset': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e50914;">Reset Your Password</h1>
          <p>Hi {{userName}},</p>
          <p>You requested to reset your StreamFlix password. Click the button below to create a new password:</p>
          <a href="{{resetUrl}}" style="background-color: #e50914; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          <p>This link will expire in {{expiryHours}} hours.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
      'stream-started': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e50914;">{{streamerName}} is now live!</h1>
          <p>Hi {{userName}},</p>
          <p>{{streamerName}} just started streaming: <strong>{{streamTitle}}</strong></p>
          <a href="{{streamUrl}}" style="background-color: #e50914; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Watch Now</a>
          <p><a href="{{unsubscribeUrl}}">Unsubscribe from notifications</a></p>
        </div>
      `,
    };

    const templateContent = templates[templateName] || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e50914;">StreamFlix</h1>
        <p>{{message}}</p>
      </div>
    `;

    this.templates.set(templateName, {
      name: templateName,
      subject: this.getDefaultSubject(templateName),
      html: templateContent,
    });
  }
}
