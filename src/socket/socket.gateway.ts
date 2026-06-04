// src/socket/socket.gateway.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { instrument } from '@socket.io/admin-ui';

@WebSocketGateway({
  cors: {
    origin: ['*', 'http://localhost:3000', 'https://admin.socket.io'],
    credentials: true,
  },
})
@Injectable()
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private pendingHandlers: Array<{
    event: string;
    handler: (client: Socket, data: any) => Promise<void>;
  }> = [];

  // Local in-memory maps to replace Redis
  private socketIdToUserId: Map<string, string> = new Map();
  private userIdToSocketId: Map<string, string> = new Map();

  constructor(
    private readonly jwtService: JwtService
  ) {}

  afterInit(server: Server) {
    console.log('Initializing Socket Gateway...');
    this.server = server;

    // Register pending handlers
    this.pendingHandlers.forEach(({ event, handler }) => {
      this.registerHandler(event, handler);
    });
    this.pendingHandlers = [];
    instrument(server, {
      auth: false, // test without auth first
    });
    this.logger.log('Socket server initialized');
  }

  registerEventHandler(event: string, handler: (client: Socket, data: any) => Promise<void>) {
    if (this.server) {
      this.registerHandler(event, handler);
    } else {
      this.pendingHandlers.push({ event, handler });
    }
  }

  async handleConnection(client: Socket) {
    try {
      // Accept token from handshake.auth.token or handshake.headers.authorization
      const token = client.handshake.query?.token as string;
      if (!token) {
        client.disconnect(true);
        throw new UnauthorizedException('Missing token');
      }
      const decoded = this.jwtService.verify(token);
      const userId = decoded.uid;
      if (!userId) {
        client.disconnect(true);
        throw new UnauthorizedException('Invalid token payload');
      }
      // Attach userId to socket for later use
      (client as any).userId = userId;
      // Store in local maps
      this.socketIdToUserId.set(client.id, userId);
      this.userIdToSocketId.set(userId, client.id);
      console.log(`User ${userId} connected with socket ${client.id}`);
    } catch (err) {
      client.disconnect(true);
      this.logger.warn(`Socket connection refused: ${err.message}`);
    }
  }
  
  async handleDisconnect(client: Socket) {
    const userId = this.socketIdToUserId.get(client.id);
    if (userId) {
      this.socketIdToUserId.delete(client.id);
      this.userIdToSocketId.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  private registerHandler(event: string, handler: (client: Socket, data: any) => Promise<void>) {
    this.server.sockets.on('connection', (socket) => {
      socket.on(event, async (data: any) => {
        try {
          await handler(socket, data);
        } catch (error) {
          this.logger.error(`Error in ${event} handler:`, error);
        }
      });
    });
  }

  async emitToUser(userId: string, event: string, data: any): Promise<boolean> {
    const socketId = this.userIdToSocketId.get(userId);
    if (socketId) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
        this.logger.log(`Event ${event} emitted to user ${userId} (socket ${socketId})`);
        return true;
      } else {
        this.logger.warn(`Socket ${socketId} for user ${userId} not found or disconnected.`);
        return false;
      }
    } else {
      this.logger.warn(`No socketId found for user ${userId} in local map.`);
      return false;
    }
  }

  async broadcastFromClient(client: Socket, event: string, data: any) {
    client.broadcast.emit(event, data);
  }
  async emitToRoom(roomId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(roomId).emit(event, data);
    }
  }
}