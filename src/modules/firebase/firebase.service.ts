import {Injectable, Logger} from '@nestjs/common';
import * as admin from 'firebase-admin';
import {UserService} from '../user/user.service';

@Injectable()
export class FirebaseService {
    constructor(private readonly userService: UserService) {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(require('../../../icedrop-465604-firebase-adminsdk-fbsvc-7fb23549d7.json')),
            });
            Logger.log('Firebase Admin initialized');
        }
    }

    async sendNotification(
        token: string,
        title: string,
        body: string,
        data: Record<string, string> = {},
        dataOnly: boolean = false,
        notificationType: string
    ) {
        try {
            // Always include notificationType in data
            Logger.log("NotificationType", notificationType);
            const payloadData = {...data, notificationType};
            Logger.log(` token ${token} with data: ${JSON.stringify(payloadData)}`);

            const message: any = {
                token,
                data: payloadData,
            };
            if (!dataOnly) {
                message.notification = {title, body};
            }
            const response = await admin.messaging().send(message);
            Logger.log(`FCM sent: ${response}`);
            return response;
        } catch (error) {
            Logger.error('FCM send error:', error);
            throw error;
        }
    }

    async sendNotificationToUser(
        userId: string,
        title: string,
        body: string,
        data: Record<string, string> = {},
        notificationType: string,
        dataOnly: boolean = false
    ) {
        try {
            const user: any = await this.userService.getProfile(userId);
            if (!user || !user.FCMToken) {
                Logger.warn(`No FCM token found for user ${userId}`);
                return null;
            }
            return await this.sendNotification(
                user.FCMToken,
                title,
                body,
                data,
                dataOnly,
                notificationType
            );
        } catch (error) {
            Logger.error(`Error sending notification to user ${userId}:`, error);
            return null;
        }
    }
}
