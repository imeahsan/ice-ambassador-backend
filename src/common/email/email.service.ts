import { Injectable, Logger } from '@nestjs/common';
import {
    SESClient,
    SendEmailCommand,
    SendEmailCommandInput,
    SendEmailCommandOutput,
} from '@aws-sdk/client-ses';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailService {
    private readonly ses: SESClient;
    private readonly logger = new Logger(EmailService.name);
    private readonly templates: Map<string, Handlebars.TemplateDelegate> = new Map();
    private readonly sender: string;
    private readonly templateDirectories = [
        path.join(process.cwd(), 'dist', 'common', 'email', 'templates'),
        path.join(process.cwd(), 'src', 'common', 'email', 'templates'),
    ];

    constructor() {
        this.ses = new SESClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        this.sender = process.env.EMAIL_SENDER!;
        this.loadTemplates();
    }

    private loadTemplates(): void {
        try {
            const templatesDir = this.templateDirectories.find((directory) => fs.existsSync(directory));

            if (!templatesDir) {
                throw new Error(`No email templates directory found in: ${this.templateDirectories.join(', ')}`);
            }

            const templateFiles = fs.readdirSync(templatesDir);
            for (const file of templateFiles) {
                if (file.endsWith('.hbs')) {
                    const templateName = path.basename(file, '.hbs');
                    const templateContent = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
                    const compiledTemplate = Handlebars.compile(templateContent);
                    this.templates.set(templateName, compiledTemplate);
                    this.logger.log(`Loaded email template: ${templateName}`);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to load email templates: ${error.message}`);
        }
    }

    async sendTemplatedEmail(
        templateName: string,  context: Record<string, any>, subject: string, recipients: string[],
    ): Promise<SendEmailCommandOutput> {
        try {
            const template = this.templates.get(templateName);

            if (!template) {
                throw new Error(`Email template "${templateName}" not found`);
            }

            const htmlContent = template(context);

            const params: SendEmailCommandInput = {
                Source: this.sender,
                Destination: {
                    ToAddresses: recipients,
                },
                Message: {
                    Subject: {
                        Data: subject,
                        Charset: 'UTF-8',
                    },
                    Body: {
                        Html: {
                            Data: htmlContent,
                            Charset: 'UTF-8',
                        },
                    },
                },
            };

            const command = new SendEmailCommand(params);
            const result = await this.ses.send(command);
            this.logger.log(`Email sent to ${recipients.join(', ')} using template ${templateName}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to send email: ${error.message}`);
            throw error;
        }
    }

    async sendWelcomeEmail(email: string, name: string): Promise<SendEmailCommandOutput> {
        return this.sendTemplatedEmail(
            'welcome',
            { name, currentYear: new Date().getFullYear() },
            'Welcome to Our Platform!',
            [email],
        );
    }

    async sendPasswordResetEmail(email: string, resetLink: string): Promise<SendEmailCommandOutput> {
        return this.sendTemplatedEmail(
            'password-reset',
            { resetLink, expiryHours: 24 },
            'Reset Your Password',
            [email],
        );
    }

    async sendVerificationEmail(email: string, verificationLink: string): Promise<SendEmailCommandOutput> {
        return this.sendTemplatedEmail(
            'verification',
            { verificationLink, expiryHours: 48 },
            'Verify Your Email Address',
            [email],
        );
    }
}
