import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connect(token: string) {
  socket = io('http://localhost:3000', {
    auth: { token },
    transports: ['websocket'],
  });
  return socket;
}

export function disconnect() {
  socket?.disconnect();
  socket = null;
}

export function onTelemetry(callback: (data: unknown) => void) {
  socket?.on('telemetry', callback);
}
