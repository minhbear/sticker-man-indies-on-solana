import { NextRequest, NextResponse } from 'next/server';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  GameRoom, 
  Player, 
  GameState, 
  Position, 
  Velocity, 
  Controls,
  GameConfig 
} from '@/types/game';
import { GameLogic } from '@/utils/gameLogic';

// Game configuration
const GAME_CONFIG: GameConfig = {
  canvasWidth: 800,
  canvasHeight: 600,
  playerWidth: 40,
  playerHeight: 60,
  gravity: 0.8,
  jumpForce: 15,
  moveSpeed: 5,
  attackRange: 60,
  attackDamage: 10,
  attackCooldown: 500,
};

// Global variables to store game state
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;
let gameRooms: Map<string, GameRoom> = new Map();
let gameLogic: GameLogic = new GameLogic(GAME_CONFIG);

// Generate random room ID
function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new player
function createPlayer(socketId: string, name: string, playerIndex: number): Player {
  const position = gameLogic.generateSpawnPosition(playerIndex);
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b'];
  
  return {
    id: socketId,
    name,
    position,
    velocity: { x: 0, y: 0 },
    health: 100,
    maxHealth: 100,
    isAttacking: false,
    isJumping: false,
    isGrounded: true,
    facingDirection: playerIndex === 0 ? 'right' : 'left',
    color: colors[playerIndex % colors.length],
    isAlive: true,
    attackCooldown: 0,
    lastAttackTime: 0,
  };
}

// Initialize Socket.IO server
function initializeSocketIO(server: NetServer) {
  if (io) return io;

  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
    path: '/api/socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Handle room creation
    socket.on('createRoom', () => {
      const roomId = generateRoomId();
      const newRoom: GameRoom = {
        id: roomId,
        players: {},
        gameState: GameState.WAITING,
        createdAt: new Date(),
        maxPlayers: 2,
        currentPlayers: 0,
      };

      gameRooms.set(roomId, newRoom);
      socket.emit('roomCreated', roomId);
      console.log('Room created:', roomId);
    });

    // Handle room joining
    socket.on('joinRoom', (roomId: string, playerName: string) => {
      const room = gameRooms.get(roomId);
      
      if (!room) {
        socket.emit('roomNotFound');
        return;
      }

      if (room.currentPlayers >= room.maxPlayers) {
        socket.emit('roomFull');
        return;
      }

      // Create player
      const playerIndex = Object.keys(room.players).length;
      const player = createPlayer(socket.id, playerName, playerIndex);
      
      // Add player to room
      room.players[socket.id] = player;
      room.currentPlayers++;

      // Join socket room
      socket.join(roomId);
      
      // Notify client
      socket.emit('roomJoined', room);
      
      // Notify other players
      socket.to(roomId).emit('playerJoined', player);
      
      // Update game state if room is full
      if (room.currentPlayers === room.maxPlayers) {
        room.gameState = GameState.READY;
        io?.to(roomId).emit('gameStateChanged', room.gameState);
        
        // Auto-start game after a short delay
        setTimeout(() => {
          room.gameState = GameState.IN_PROGRESS;
          room.gameStartTime = new Date();
          io?.to(roomId).emit('gameStarted');
          io?.to(roomId).emit('gameUpdate', room);
        }, 2000);
      }

      console.log(`Player ${playerName} joined room ${roomId}`);
    });

    // Handle player movement
    socket.on('playerMove', (position: Position, velocity: Velocity, controls: Controls) => {
      const playerRoom = findPlayerRoom(socket.id);
      if (!playerRoom || playerRoom.gameState !== GameState.IN_PROGRESS) return;

      const player = playerRoom.players[socket.id];
      if (!player || !player.isAlive) return;

      // Update player state
      player.position = position;
      player.velocity = velocity;
      player.isJumping = !player.isGrounded;
      
      // Update facing direction based on movement
      if (velocity.x > 0) {
        player.facingDirection = 'right';
      } else if (velocity.x < 0) {
        player.facingDirection = 'left';
      }

      // Apply physics and constraints
      const updatedPlayer = gameLogic.constrainPlayerToBounds(player);
      playerRoom.players[socket.id] = updatedPlayer;

      // Broadcast to other players in room
      socket.to(playerRoom.id).emit('playerMoved', socket.id, position, velocity);
      
      // Send updated room state
      io?.to(playerRoom.id).emit('gameUpdate', playerRoom);
    });

    // Handle player attack
    socket.on('playerAttack', () => {
      const playerRoom = findPlayerRoom(socket.id);
      if (!playerRoom || playerRoom.gameState !== GameState.IN_PROGRESS) return;

      const attacker = playerRoom.players[socket.id];
      if (!attacker || !attacker.isAlive) return;

      const currentTime = Date.now();
      if (!gameLogic.canPlayerAttack(attacker, currentTime)) return;

      // Update attacker state
      playerRoom.players[socket.id] = gameLogic.updatePlayerAttack(attacker, true, currentTime);

      // Check for hits on other players
      let targetHit: string | undefined;
      Object.entries(playerRoom.players).forEach(([playerId, player]) => {
        if (playerId !== socket.id && player.isAlive) {
          if (gameLogic.checkAttackHit(attacker, player)) {
            // Apply damage
            const damagedPlayer = gameLogic.applyDamage(player, GAME_CONFIG.attackDamage);
            playerRoom.players[playerId] = damagedPlayer;
            
            // Apply knockback
            const knockbackPosition = gameLogic.calculateKnockback(attacker, player);
            playerRoom.players[playerId].position = knockbackPosition;
            
            targetHit = playerId;
            
            // Emit health change
            io?.to(playerRoom.id).emit('playerHealthChanged', playerId, damagedPlayer.health);
          }
        }
      });

      // Broadcast attack
      io?.to(playerRoom.id).emit('playerAttacked', socket.id, targetHit);
      
      // Check for game end
      const winner = gameLogic.checkGameEnd(playerRoom.players);
      if (winner) {
        playerRoom.gameState = GameState.FINISHED;
        playerRoom.winner = winner;
        io?.to(playerRoom.id).emit('gameEnded', winner);
      }

      // Reset attack state after animation
      setTimeout(() => {
        if (playerRoom.players[socket.id]) {
          playerRoom.players[socket.id] = gameLogic.updatePlayerAttack(
            playerRoom.players[socket.id], 
            false, 
            currentTime
          );
        }
      }, 300);

      // Send updated room state
      io?.to(playerRoom.id).emit('gameUpdate', playerRoom);
    });

    // Handle player ready
    socket.on('playerReady', () => {
      const playerRoom = findPlayerRoom(socket.id);
      if (!playerRoom) return;

      // Check if all players are ready (simplified - just start game)
      if (playerRoom.currentPlayers === playerRoom.maxPlayers && playerRoom.gameState === GameState.READY) {
        playerRoom.gameState = GameState.IN_PROGRESS;
        playerRoom.gameStartTime = new Date();
        io?.to(playerRoom.id).emit('gameStarted');
        io?.to(playerRoom.id).emit('gameUpdate', playerRoom);
      }
    });

    // Handle leaving room
    socket.on('leaveRoom', () => {
      handlePlayerDisconnect(socket.id);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      handlePlayerDisconnect(socket.id);
    });
  });

  return io;
}

// Find which room a player is in
function findPlayerRoom(playerId: string): GameRoom | null {
  for (const room of gameRooms.values()) {
    if (room.players[playerId]) {
      return room;
    }
  }
  return null;
}

// Handle player disconnect
function handlePlayerDisconnect(playerId: string) {
  const playerRoom = findPlayerRoom(playerId);
  if (!playerRoom) return;

  // Remove player from room
  delete playerRoom.players[playerId];
  playerRoom.currentPlayers--;

  // Notify other players
  io?.to(playerRoom.id).emit('playerLeft', playerId);
  io?.to(playerRoom.id).emit('playerDisconnected', playerId);

  // Clean up empty rooms or end game
  if (playerRoom.currentPlayers === 0) {
    gameRooms.delete(playerRoom.id);
    console.log('Room deleted:', playerRoom.id);
  } else if (playerRoom.gameState === GameState.IN_PROGRESS) {
    // End game if in progress
    const remainingPlayer = Object.keys(playerRoom.players)[0];
    playerRoom.gameState = GameState.FINISHED;
    playerRoom.winner = remainingPlayer;
    io?.to(playerRoom.id).emit('gameEnded', remainingPlayer);
  }
}

// API route handler
export async function GET(req: NextRequest) {
  // This endpoint can be used for health checks
  return NextResponse.json({ status: 'Socket.IO server ready' });
}

export async function POST(req: NextRequest) {
  // Initialize Socket.IO server if needed
  const res = NextResponse.json({ message: 'Socket.IO initialized' });
  
  // Note: In a real deployment, you'd need to handle the server initialization differently
  // This is a simplified version for development
  
  return res;
}

// Export for Next.js to handle Socket.IO
export const dynamic = 'force-dynamic';