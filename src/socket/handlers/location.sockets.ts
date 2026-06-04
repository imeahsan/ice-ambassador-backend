// src/handlers/handlers.socket-handler.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Socket } from 'socket.io';
import {SocketGateway} from "../socket.gateway";

@Injectable()
export class LocationSockets implements OnModuleInit {
    private readonly logger = new Logger(LocationSockets.name);

    constructor(private readonly socketGateway: SocketGateway,
    ) {}

    onModuleInit() {
        this.socketGateway.registerEventHandler('driver-location-update', this.handleDriverLocationUpdate.bind(this));
    }

    private async handleDriverLocationUpdate(client: Socket, message: any) {
        const userId = client.userId || "";
        this.logger.log(`Location from user ${userId}:`);


        console.log(message);
        // Process handlers message...
        await this.socketGateway.emitToUser(userId, 'driver-location-update', { status: 'received' });
    }



}