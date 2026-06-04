// src/socket/socket.module.ts

import { Module, OnModuleInit } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { JwtModule } from '@nestjs/jwt';
import { LocationSockets } from './handlers/location.sockets';
import {ChatSockets} from "./handlers/chat.sockets";
import {FirebaseModule} from "../modules/firebase/firebase.module";
import { EventEmitter2 } from '@nestjs/event-emitter';


@Module({
    imports: [ JwtModule.register({ secret: 'secretkey' }),FirebaseModule],
    providers: [SocketGateway, LocationSockets,  ChatSockets, ],
    exports: [SocketGateway, LocationSockets, ChatSockets,],
})
export class SocketModule implements OnModuleInit {
    constructor(private readonly eventEmitter: EventEmitter2, private readonly socketGateway: SocketGateway) {}

    onModuleInit() {
        // Delivery created
        this.eventEmitter.on('delivery.created', ({ delivery, senderId }) => {
            this.socketGateway.emitToUser(senderId, 'delivery-created', delivery).catch((err) => {
                console.error('Error emitting delivery_created socket event', err);
            });
        });

        // Delivery status updated
        this.eventEmitter.on('delivery.statusUpdated', ({ delivery, senderId }) => {
            this.socketGateway.emitToUser(senderId, 'delivery-status-updated', delivery).catch((err) => {
                console.error('Error emitting delivery_status_updated socket event', err);
            });
        });

        // Delivery ended
        this.eventEmitter.on('delivery.ended', ({ delivery, senderId }) => {
            this.socketGateway.emitToUser(senderId, 'delivery-ended', delivery).catch((err) => {
                console.error('Error emitting delivery_ended socket event', err);
            });
        });

        // Delivery accepted (with enriched payload)
        this.eventEmitter.on('delivery.accepted', ({ payload, senderId }) => {
            this.socketGateway.emitToUser(senderId, 'delivery-accepted', payload).catch((err) => {
                console.error('Error emitting delivery_accepted socket event', err);
            });
        });

        // Delivery location updated
        this.eventEmitter.on('delivery.locationUpdated', ({ deliveryId, location, customerId }) => {
            this.socketGateway.emitToUser(customerId, 'delivery-location-updated', { deliveryId, location }).catch((err) => {
                console.error('Error emitting delivery_location_updated socket event', err);
            });
        });
    }
}
