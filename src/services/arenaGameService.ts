import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const isBrowser = typeof window !== 'undefined';
const DIRECT_API_URL = process.env.ARENA_DIRECT_API_URL || 'https://airdrop-arcade.onrender.com/api';
const DIRECT_API_BASE = (() => {
  try {
    return new URL(DIRECT_API_URL).origin;
  } catch {
    return 'https://airdrop-arcade.onrender.com';
  }
})();
const GAME_API_URL = process.env.NEXT_PUBLIC_GAME_API_URL || (isBrowser ? '/api/arena' : DIRECT_API_URL);

function normalizeWebsocketUrl(url?: string | null): string | null {
  if (!url) return null;

  try {
    return new URL(url).toString();
  } catch {
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    return `${DIRECT_API_BASE}${normalizedPath}`;
  }
}
const ARENA_SOCKET_PATH = process.env.NEXT_PUBLIC_ARENA_SOCKET_PATH || '/socket.io';
const VORLD_APP_ID = process.env.NEXT_PUBLIC_VORLD_APP_ID || '';
const ARENA_GAME_ID = process.env.NEXT_PUBLIC_ARENA_GAME_ID || '';

export interface GamePlayer {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameEvent {
  id: string;
  eventName: string;
  isFinal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GamePackage {
  id: string;
  name: string;
  image: string;
  stats: Array<{
    name: string;
    currentValue: number;
    maxValue: number;
    description: string;
  }>;
  players: string[];
  type: string;
  cost: number;
  unlockAtPoints: number;
  metadata: {
    id: string;
    type: string;
    quantity: string;
    damage?: number;
    defense?: number;
    speed?: number;
    duration?: number;
  };
}

export interface EvaGameDetails {
  _id: string;
  gameId: string;
  vorldAppId: string;
  appName: string;
  gameDeveloperId: string;
  arcadeGameId: string;
  isActive: boolean;
  numberOfCycles: number;
  cycleTime: number;
  waitingTime: number;
  players: GamePlayer[];
  events: GameEvent[];
  packages: GamePackage[];
  createdAt: string;
  updatedAt: string;
}

export interface GameState {
  gameId: string;
  expiresAt: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  websocketUrl: string;
  evaGameDetails: EvaGameDetails;
  arenaActive: boolean;
  countdownStarted: boolean;
}

export interface BoostData {
  playerId: string;
  playerName: string;
  boosterUsername: string;
  boostAmount: number;
  playerCurrentCyclePoints: number;
  playerTotalPoints: number;
  arenaCoinsSpent: number;
  newArenaCoinsBalance: number;
}

export interface ItemDrop {
  itemId: string;
  itemName: string;
  targetPlayer: string;
  position: { x: number; y: number };
  timestamp: string;
  cost: number;
  stats: GamePackage['stats'];
  metadata: GamePackage['metadata'];
}

export interface PackageDrop {
  gameId: string;
  currentCycle: number;
  items: ItemDrop[];
  timestamp: string;
}

export class ArenaGameService {
  private socket: Socket | null = null;
  private gameState: GameState | null = null;
  private userToken: string = '';
  private currentGameId: string | null = null;
  
  // Event callbacks
  public onArenaCountdownStarted?: (data: any) => void;
  public onCountdownUpdate?: (data: any) => void;
  public onArenaBegins?: (data: any) => void;
  public onPlayerBoostActivated?: (data: BoostData) => void;
  public onBoostCycleUpdate?: (data: any) => void;
  public onBoostCycleComplete?: (data: any) => void;
  public onPackageDrop?: (data: PackageDrop) => void;
  public onImmediateItemDrop?: (data: ItemDrop) => void;
  public onEventTriggered?: (data: any) => void;
  public onPlayerJoined?: (data: any) => void;
  public onGameCompleted?: (data: any) => void;
  public onGameStopped?: (data: any) => void;

  constructor(userToken: string) {
    this.userToken = userToken;
  }

  // Initialize game with stream URL
  async initializeGame(streamUrl: string): Promise<{ success: boolean; data?: GameState; error?: string }> {
    try {
      const response = await axios.post(`${GAME_API_URL}/games/init`, {
        streamUrl
      }, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'X-Arena-Arcade-Game-ID': ARENA_GAME_ID,
          'X-Vorld-App-ID': VORLD_APP_ID,
          'Content-Type': 'application/json'
        }
      });

      this.gameState = response.data.data;
      const resolvedUrl = normalizeWebsocketUrl(this.gameState?.websocketUrl);
      if (this.gameState && resolvedUrl) {
        this.gameState = { ...this.gameState, websocketUrl: resolvedUrl };
      }
      this.currentGameId = this.gameState?.gameId || null;
      
      // Connect to WebSocket
      if (this.gameState?.gameId) {
        await this.connectWebSocket();
      }

      return {
        success: true,
        data: this.gameState || undefined
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to initialize game'
      };
    }
  }

  // Connect to WebSocket
  private async connectWebSocket(): Promise<boolean> {
    try {
      if (!this.gameState?.gameId || !this.gameState.websocketUrl) return false;

      const targetGameId = this.gameState.gameId;
      const parsedUrl = new URL(this.gameState.websocketUrl);
      const namespace = parsedUrl.pathname || '/';
      const baseUrl = parsedUrl.origin;
      const connectionUrl = `${baseUrl}${namespace}`;

      if (this.socket && this.currentGameId === targetGameId && this.socket.connected) {
        return true;
      }

      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      const socket = io(connectionUrl, {
        path: ARENA_SOCKET_PATH,
        transports: ['websocket', 'polling'],
        auth: {
          token: this.userToken,
          appId: VORLD_APP_ID,
          arenaGameId: ARENA_GAME_ID,
          gameId: targetGameId,
        },
      });

      this.socket = socket;
      this.currentGameId = targetGameId;
      this.setupSocketEventListeners(socket);

      return new Promise((resolve) => {
        socket.on('connect', () => {
          console.log('Connected to Arena Socket');
          socket.emit('join_game', { gameId: targetGameId });
          resolve(true);
        });

        socket.on('connect_error', (error) => {
          console.error('Arena socket connection failed:', error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Failed to connect to Arena socket:', error);
      return false;
    }
  }

  // Set up Socket.IO event listeners
  private setupSocketEventListeners(socket: Socket): void {
    socket.off('arena_countdown_started');
    socket.on('arena_countdown_started', (data) => {
      this.onArenaCountdownStarted?.(data);
    });

    socket.off('countdown_update');
    socket.on('countdown_update', (data) => {
      this.onCountdownUpdate?.(data);
    });

    socket.off('arena_begins');
    socket.on('arena_begins', (data) => {
      this.onArenaBegins?.(data);
    });

    socket.off('arena_ends');
    socket.on('arena_ends', (data) => {
      this.onGameCompleted?.(data);
    });

    socket.off('arena_completed');
    socket.on('arena_completed', (data) => {
      this.onGameCompleted?.(data);
    });

    socket.off('player_boost_activated');
    socket.on('player_boost_activated', (data) => {
      this.onPlayerBoostActivated?.(data);
    });

    socket.off('boost_cycle_update');
    socket.on('boost_cycle_update', (data) => {
      this.onBoostCycleUpdate?.(data);
    });

    socket.off('boost_cycle_complete');
    socket.on('boost_cycle_complete', (data) => {
      this.onBoostCycleComplete?.(data);
    });

    socket.off('package_drop');
    socket.on('package_drop', (data) => {
      this.onPackageDrop?.(data);
    });

    socket.off('immediate_item_drop');
    socket.on('immediate_item_drop', (data) => {
      this.onImmediateItemDrop?.(data);
    });

    socket.off('game_state_update');
    socket.on('game_state_update', (data) => {
      this.onEventTriggered?.(data);
    });

    socket.off('event_triggered');
    socket.on('event_triggered', (data) => {
      this.onEventTriggered?.(data);
    });

    socket.off('player_joined');
    socket.on('player_joined', (data) => {
      this.onPlayerJoined?.(data);
    });

    socket.off('game_completed');
    socket.on('game_completed', (data) => {
      this.onGameCompleted?.(data);
    });

    socket.off('game_stopped');
    socket.on('game_stopped', (data) => {
      this.onGameStopped?.(data);
    });

    socket.off('joined_game');
    socket.on('joined_game', (data) => {
      console.log('Arena socket joined game:', data);
    });

    socket.off('disconnect');
    socket.on('disconnect', (reason) => {
      console.log('Arena socket disconnected:', reason);
      if (this.currentGameId && reason === 'io server disconnect') {
        // Server requested disconnect; attempt to reconnect automatically
        setTimeout(() => {
          if (socket.disconnected) {
            socket.connect();
          }
        }, 1000);
      }
    });

    socket.off('error');
    socket.on('error', (error) => {
      console.error('Arena socket error:', error);
    });

    socket.off('reconnect');
    socket.on('reconnect', () => {
      if (this.currentGameId) {
        console.log('Arena socket reconnected, re-joining game');
        socket.emit('join_game', { gameId: this.currentGameId });
      }
    });
  }

  // Get game details
  async getGameDetails(gameId: string): Promise<{ success: boolean; data?: GameState; error?: string }> {
    try {
      const response = await axios.get(`${GAME_API_URL}/games/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'X-Arena-Arcade-Game-ID': ARENA_GAME_ID,
          'X-Vorld-App-ID': VORLD_APP_ID
        }
      });

      this.gameState = response.data.data;
      const resolvedUrl = normalizeWebsocketUrl(this.gameState?.websocketUrl);
      if (this.gameState && resolvedUrl) {
        this.gameState = { ...this.gameState, websocketUrl: resolvedUrl };
      }
      this.currentGameId = this.gameState?.gameId || null;

      if (this.gameState?.gameId) {
        await this.connectWebSocket();
      }

      return {
        success: true,
        data: this.gameState
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get game details'
      };
    }
  }

  async joinExistingGame(gameId: string): Promise<{ success: boolean; data?: GameState; error?: string }> {
    return this.getGameDetails(gameId);
  }

  // Boost a player
  async boostPlayer(gameId: string, playerId: string, amount: number, username: string): Promise<{ success: boolean; data?: BoostData; error?: string }> {
    try {
      const response = await axios.post(`${GAME_API_URL}/games/boost/player/${gameId}/${playerId}`, {
        amount,
        username
      }, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'X-Arena-Arcade-Game-ID': ARENA_GAME_ID,
          'X-Vorld-App-ID': VORLD_APP_ID,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to boost player'
      };
    }
  }

  // Get items catalog
  async getItemsCatalog(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await axios.get(`${GAME_API_URL}/items/catalog`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'X-Arena-Arcade-Game-ID': ARENA_GAME_ID,
          'X-Vorld-App-ID': VORLD_APP_ID
        }
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get items catalog'
      };
    }
  }

  // Drop immediate item
  async dropImmediateItem(gameId: string, itemId: string, targetPlayer: string): Promise<{ success: boolean; data?: ItemDrop; error?: string }> {
    try {
      const response = await axios.post(`${GAME_API_URL}/items/drop/${gameId}`, {
        itemId,
        targetPlayer
      }, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'X-Arena-Arcade-Game-ID': ARENA_GAME_ID,
          'X-Vorld-App-ID': VORLD_APP_ID,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to drop item'
      };
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.socket = null;
    this.gameState = null;
    this.currentGameId = null;
  }

  // Get current game state
  getGameState(): GameState | null {
    return this.gameState;
  }
}
