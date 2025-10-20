// Game Types and Interfaces for Sticker Man Fighting Game

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

// Weapon Types
export interface WeaponInfo {
  id: string;
  name: string;
  type: 'sword' | 'axe' | 'bow' | 'staff';
  damage: number;
  range: number;
  cooldown: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  description: string;
}

// Vorld integration types
export interface DroppedItem {
  id: string;
  type: 'weapon' | 'shield' | 'consumable';
  name: string;
  position: Position;
  properties: {
    attack?: number;
    defense?: number;
    heal?: number;
    speedBoost?: number;
    duration?: number; // for temporary boosts
  };
  icon: string;
  droppedBy: string; // viewer name or 'system' for timed spawns
  droppedAt: number; // timestamp
  weaponInfo?: WeaponInfo; // Additional weapon-specific data
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  velocity: Velocity;
  health: number;
  maxHealth: number;
  isAttacking: boolean;
  isJumping: boolean;
  isGrounded: boolean;
  facingDirection: 'left' | 'right';
  color: string;
  isAlive: boolean;
  attackCooldown: number;
  lastAttackTime: number;
  // Vorld integration - equipped items
  equippedWeapon?: DroppedItem;
  equippedShield?: DroppedItem;
  attackDamage: number;
  defense: number;
  moveSpeedMultiplier: number;
}

export interface GameRoom {
  id: string;
  players: { [playerId: string]: Player };
  gameState: GameState;
  createdAt: Date;
  maxPlayers: number;
  currentPlayers: number;
  gameStartTime?: Date;
  winner?: string;
  // Vorld integration - items in arena
  droppedItems: Record<string, DroppedItem>;
}

export enum GameState {
  WAITING = 'waiting',
  READY = 'ready', 
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished'
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerWidth: number;
  playerHeight: number;
  gravity: number;
  jumpForce: number;
  moveSpeed: number;
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;
}

export interface Controls {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
}

// Socket.IO Event Types
export interface ServerToClientEvents {
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  playerMoved: (playerId: string, position: Position, velocity: Velocity) => void;
  playerAttacked: (playerId: string, targetId?: string) => void;
  playerHealthChanged: (playerId: string, health: number) => void;
  gameStateChanged: (gameState: GameState) => void;
  gameStarted: () => void;
  gameEnded: (winner: string) => void;
  roomCreated: (roomId: string) => void;
  roomJoined: (room: GameRoom) => void;
  roomFull: () => void;
  roomNotFound: () => void;
  playerDisconnected: (playerId: string) => void;
  gameUpdate: (room: GameRoom) => void;
  // Vorld integration events
  itemDropped: (item: DroppedItem) => void;
  itemPickedUp: (playerId: string, itemId: string) => void;
  itemEquipped: (playerId: string, item: DroppedItem) => void;
}

export interface ClientToServerEvents {
  createRoom: () => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  playerMove: (position: Position, velocity: Velocity, controls: Controls) => void;
  playerAttack: () => void;
  playerReady: () => void;
  // Vorld integration events
  pickupItem: (itemId: string) => void;
  equipItem: (itemId: string, slot: 'weapon' | 'shield') => void;
}

export interface AttackHitbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameLoop {
  update: () => void;
  render: () => void;
  start: () => void;
  stop: () => void;
  isRunning: boolean;
}