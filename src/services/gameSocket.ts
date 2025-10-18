'use client';

import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents, GameRoom, Position, Velocity, Controls } from '@/types/game';

class GameSocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private isConnected = false;

  connect(): Promise<Socket<ServerToClientEvents, ClientToServerEvents>> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        resolve(this.socket);
        return;
      }

      // For development, connect to the same origin
      // In production, you might want to configure this differently
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('Connected to game server');
        this.isConnected = true;
        resolve(this.socket!);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from game server');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        reject(error);
      });

      // Set up a timeout for connection
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Room Management
  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('createRoom');
      
      this.socket.once('roomCreated', (roomId: string) => {
        resolve(roomId);
      });

      // Timeout for room creation
      setTimeout(() => {
        reject(new Error('Room creation timeout'));
      }, 5000);
    });
  }

  joinRoom(roomId: string, playerName: string): Promise<GameRoom> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('joinRoom', roomId, playerName);
      
      const handleRoomJoined = (room: GameRoom) => {
        this.socket!.off('roomFull');
        this.socket!.off('roomNotFound');
        resolve(room);
      };

      const handleRoomFull = () => {
        this.socket!.off('roomJoined');
        this.socket!.off('roomNotFound');
        reject(new Error('Room is full'));
      };

      const handleRoomNotFound = () => {
        this.socket!.off('roomJoined');
        this.socket!.off('roomFull');
        reject(new Error('Room not found'));
      };

      this.socket.once('roomJoined', handleRoomJoined);
      this.socket.once('roomFull', handleRoomFull);
      this.socket.once('roomNotFound', handleRoomNotFound);

      // Timeout for joining room
      setTimeout(() => {
        this.socket!.off('roomJoined');
        this.socket!.off('roomFull');
        this.socket!.off('roomNotFound');
        reject(new Error('Join room timeout'));
      }, 5000);
    });
  }

  leaveRoom() {
    if (this.socket) {
      this.socket.emit('leaveRoom');
    }
  }

  // Player Actions
  sendPlayerMove(position: Position, velocity: Velocity, controls: Controls) {
    if (this.socket && this.isConnected) {
      this.socket.emit('playerMove', position, velocity, controls);
    }
  }

  sendPlayerAttack() {
    if (this.socket && this.isConnected) {
      this.socket.emit('playerAttack');
    }
  }

  sendPlayerReady() {
    if (this.socket && this.isConnected) {
      this.socket.emit('playerReady');
    }
  }

  // Event Listeners
  onPlayerJoined(callback: (player: any) => void) {
    if (this.socket) {
      this.socket.on('playerJoined', callback);
    }
  }

  onPlayerLeft(callback: (playerId: string) => void) {
    if (this.socket) {
      this.socket.on('playerLeft', callback);
    }
  }

  onPlayerMoved(callback: (playerId: string, position: Position, velocity: Velocity) => void) {
    if (this.socket) {
      this.socket.on('playerMoved', callback);
    }
  }

  onPlayerAttacked(callback: (playerId: string, targetId?: string) => void) {
    if (this.socket) {
      this.socket.on('playerAttacked', callback);
    }
  }

  onPlayerHealthChanged(callback: (playerId: string, health: number) => void) {
    if (this.socket) {
      this.socket.on('playerHealthChanged', callback);
    }
  }

  onGameStateChanged(callback: (gameState: any) => void) {
    if (this.socket) {
      this.socket.on('gameStateChanged', callback);
    }
  }

  onGameStarted(callback: () => void) {
    if (this.socket) {
      this.socket.on('gameStarted', callback);
    }
  }

  onGameEnded(callback: (winner: string) => void) {
    if (this.socket) {
      this.socket.on('gameEnded', callback);
    }
  }

  onGameUpdate(callback: (room: GameRoom) => void) {
    if (this.socket) {
      this.socket.on('gameUpdate', callback);
    }
  }

  onPlayerDisconnected(callback: (playerId: string) => void) {
    if (this.socket) {
      this.socket.on('playerDisconnected', callback);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Get connection status
  get connected(): boolean {
    return this.isConnected && this.socket !== null;
  }

  // Get socket ID
  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

// Create a singleton instance
const gameSocketService = new GameSocketService();

export default gameSocketService;