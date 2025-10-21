import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const ARENA_SERVER_URL = process.env.NEXT_PUBLIC_ARENA_SERVER_URL || 'wss://airdrop-arcade.onrender.com';

const isBrowser = typeof window !== 'undefined';
const DIRECT_API_URL = process.env.ARENA_DIRECT_API_URL || 'https://airdrop-arcade.onrender.com/api';
const GAME_API_URL = process.env.NEXT_PUBLIC_GAME_API_URL || (isBrowser ? '/api/arena' : DIRECT_API_URL);
const VORLD_APP_ID = process.env.NEXT_PUBLIC_VORLD_APP_ID || '';
const ARENA_GAME_ID = process.env.NEXT_PUBLIC_ARENA_GAME_ID || '';

export interface GamePlayer {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameItem {
  id: string;
  name: string;
  image?: string;
  type: string;
  cost: number;
  stats: Array<{
    name: string;
    currentValue: number;
    maxValue: number;
    description: string;
  }>;
  metadata?: {
    damage?: number;
    defense?: number;
    speed?: number;
    duration?: number;
  };
}

export interface ItemDrop {
  itemId: string;
  itemName: string;
  targetPlayer: string;
  position: { x: number; y: number };
  timestamp: string;
  cost: number;
  stats: GameItem['stats'];
  metadata: GameItem['metadata'];
}

export interface PackageDrop {
  gameId: string;
  currentCycle: number;
  items: ItemDrop[];
  timestamp: string;
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

export class VorldArenaService {
  private socket: Socket | null = null;
  private userToken: string = '';
  
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

  // Connect to Vorld Arena WebSocket
  async connectToArena(gameId: string): Promise<boolean> {
    try {
      this.socket = io(ARENA_SERVER_URL, {
        transports: ['websocket', 'polling'],
        auth: {
          token: this.userToken,
          gameId: gameId,
          arenaGameId: ARENA_GAME_ID
        }
      });

      this.setupEventListeners();

      return new Promise((resolve) => {
        this.socket?.on('connect', () => {
          console.log('Connected to Vorld Arena WebSocket');
          resolve(true);
        });

        this.socket?.on('connect_error', (error) => {
          console.error('Arena WebSocket connection failed:', error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Failed to connect to Arena WebSocket:', error);
      return false;
    }
  }

  // Set up WebSocket event listeners
  private setupEventListeners(): void {
    // Arena Events
    this.socket?.on('arena_countdown_started', (data) => {
      this.onArenaCountdownStarted?.(data);
    });

    this.socket?.on('countdown_update', (data) => {
      this.onCountdownUpdate?.(data);
    });

    this.socket?.on('arena_begins', (data) => {
      this.onArenaBegins?.(data);
    });

    // Boost Events
    this.socket?.on('player_boost_activated', (data) => {
      this.onPlayerBoostActivated?.(data);
    });

    this.socket?.on('boost_cycle_update', (data) => {
      this.onBoostCycleUpdate?.(data);
    });

    this.socket?.on('boost_cycle_complete', (data) => {
      this.onBoostCycleComplete?.(data);
    });

    // Package Events - This is key for your game!
    this.socket?.on('package_drop', (data) => {
      this.onPackageDrop?.(data);
    });

    this.socket?.on('immediate_item_drop', (data) => {
      this.onImmediateItemDrop?.(data);
    });

    // Game Events
    this.socket?.on('event_triggered', (data) => {
      this.onEventTriggered?.(data);
    });

    this.socket?.on('player_joined', (data) => {
      this.onPlayerJoined?.(data);
    });

    this.socket?.on('game_completed', (data) => {
      this.onGameCompleted?.(data);
    });

    this.socket?.on('game_stopped', (data) => {
      this.onGameStopped?.(data);
    });
  }

  // Create a new arena game session
  async createGame(players: GamePlayer[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await axios.post(`${GAME_API_URL}/games`, {
        players,
        maxDuration: 300000, // 5 minutes
        arenaActive: false
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
        error: error.response?.data?.message || 'Failed to create game'
      };
    }
  }

  // Get available items catalog for dropping
  async getItemsCatalog(): Promise<{ success: boolean; data?: GameItem[]; error?: string }> {
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

  // Drop immediate item to a specific player
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

  // Start the arena (enable viewer interactions)
  async startArena(gameId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await axios.post(`${GAME_API_URL}/games/${gameId}/start`, {}, {
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
        error: error.response?.data?.message || 'Failed to start arena'
      };
    }
  }

  // Stop the arena
  async stopArena(gameId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await axios.post(`${GAME_API_URL}/games/${gameId}/stop`, {}, {
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
        error: error.response?.data?.message || 'Failed to stop arena'
      };
    }
  }

  // Update stream URL for the game
  async updateStreamUrl(gameId: string, streamUrl: string, oldStreamUrl: string = ''): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await axios.put(`${GAME_API_URL}/games/${gameId}/stream-url`, {
        streamUrl,
        oldStreamUrl
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
        error: error.response?.data?.message || 'Failed to update stream URL'
      };
    }
  }

  // Boost a player (viewers can use this)
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

  // Disconnect from Arena WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Check if connected to Arena
  get connected(): boolean {
    return this.socket?.connected || false;
  }
}
