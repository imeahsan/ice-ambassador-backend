import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import * as process from 'node:process';

@Injectable()
export class TwilioService {
    private readonly client: Twilio;
    private readonly logger = new Logger(TwilioService.name);
    private readonly phoneNumber: string;

    constructor(private readonly configService: ConfigService) {
        const accountSid = process.env.TWILIO_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !phoneNumber) {
            throw new Error('Twilio credentials not configured properly');
        }

        this.phoneNumber = phoneNumber;
        this.client = new Twilio(accountSid, authToken);
        this.logger.log('Twilio client initialized successfully');
    }
    async sendSms(to: string, body: string): Promise<boolean> {
        const SIGNATURE = 'juqfN4CoFGY';
        // Avoid appending signature multiple times
        const bodyToSend = body.includes(SIGNATURE) ? body : `${body}\n${SIGNATURE}`;
        try {
            const message = await this.client.messages.create({
                body: bodyToSend,
                from: this.phoneNumber,
                to: to,
            });

            this.logger.log(`SMS sent to ${to} with SID: ${message.sid}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send SMS to ${to}: ${error.message}`);
            return false;
        }
    }

    async sendBulkSms(recipients: string[], body: string): Promise<{ success: string[]; failures: string[] }> {
        const results = {
            success: [] as string[],
            failures: [] as string[],
        };

        await Promise.all(
            recipients.map(async (phoneNumber) => {
                const success = await this.sendSms(phoneNumber, body);
                if (success) {
                    results.success.push(phoneNumber);
                } else {
                    results.failures.push(phoneNumber);
                }
            })
        );

        return results;
    }

    async sendVerificationCode(phoneNumber: string): Promise<boolean> {
        const verifySid = this.configService.get<string>('TWILIO_VERIFY_SERVICE_SID');
        if (!verifySid) {
            this.logger.error('Verify Service SID not configured');
            return false;
        }

        try {
            const verification = await this.client.verify.v2
                .services(verifySid)
                .verifications.create({ to: phoneNumber, channel: 'sms' });

            this.logger.log(`Verification code sent to ${phoneNumber}: ${verification.sid}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to send verification to ${phoneNumber}: ${error.message}`);
            return false;
        }
    }

    async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
        const verifySid = this.configService.get<string>('TWILIO_VERIFY_SERVICE_SID');
        if (!verifySid) {
            this.logger.error('Verify Service SID not configured');
            return false;
        }

        try {
            const verificationCheck = await this.client.verify.v2
                .services(verifySid)
                .verificationChecks.create({ to: phoneNumber, code });

            return verificationCheck.status === 'approved';
        } catch (error: any) {
            this.logger.error(`Verification failed for ${phoneNumber}: ${error.message}`);
            return false;
        }
    }


}