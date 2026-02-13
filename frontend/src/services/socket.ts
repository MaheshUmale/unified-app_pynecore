import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return;

    // Use environment variable or default to 5051 for backend
    const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5051';

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });
  }

  subscribe(symbol: string, interval: string) {
    if (!this.socket) this.connect();
    this.socket?.emit('subscribe', { instrumentKeys: [symbol], interval });
  }

  unsubscribe(symbol: string, interval: string) {
    this.socket?.emit('unsubscribe', { instrumentKeys: [symbol], interval });
  }

  onTick(callback: (data: any) => void) {
    this.socket?.on('raw_tick', callback);
  }

  offTick(callback: (data: any) => void) {
    this.socket?.off('raw_tick', callback);
  }

  onChartUpdate(callback: (data: any) => void) {
    this.socket?.on('chart_update', callback);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new WebSocketService();
