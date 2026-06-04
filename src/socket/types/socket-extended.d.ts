import 'socket.io';

declare module 'socket.io' {
  interface Socket {
    userId?: string;
    // Add more custom fields here as needed
  }
}

