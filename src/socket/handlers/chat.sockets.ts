// src/handlers/handlers.socket-handler.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SocketGateway } from '../socket.gateway';
import { handleSocketWithValidation } from '../utils/socket-validation.helper';
import { FirebaseService } from '../../modules/firebase/firebase.service';

@Injectable()
export class ChatSockets implements OnModuleInit {
  private readonly logger = new Logger(ChatSockets.name);

  constructor(
    private readonly socketGateway: SocketGateway,
    private readonly firebaseService: FirebaseService,
  ) {}

  onModuleInit() {
    this.socketGateway.registerEventHandler(
      'chatMessage',
      this.handleChatMessage.bind(this),
    );
    this.socketGateway.registerEventHandler(
      'joinRoom',
      this.handleJoinRoom.bind(this),
    );
  }

  private async handleChatMessage(
    client: Socket,
    message: any, // replace with dto
  ) {
    // await handleSocketWithValidation(
    //   client,
    //   'chatMessage',
    //   SendDeliveryChatMessageDto,
    //   message,
    //   async (dto: SendDeliveryChatMessageDto, client) => {
    //     console.log('Chat message received:', dto);
    //     const userId = (client as any).userId;
    //     this.logger.log(
    //       `Chat message from user ${userId}: ${JSON.stringify(dto)}`,
    //     );
    //     // Append message to delivery chat
    //     const chat = await this.deliveryChatService.appendMessage(
    //       dto.deliveryId,
    //       {
    //         senderId: dto.senderId,
    //         receiverId: dto.receiverId,
    //         content: dto.content,
    //         read: false,
    //         createdAt: new Date(),
    //       },
    //     );
    //     // Emit to room (deliveryId as room)
    //
    //     // Optionally, send ack to sender
    //     return { status: 'received', message: dto };
    //   },
    // );
  }

  private async handleJoinRoom(client: Socket, roomData: any) {
    const userId = (client as any).userId;
    this.logger.log(`User ${userId} joining room ${roomData.roomId}`);
    // Handle room joining logic...
  }
}
