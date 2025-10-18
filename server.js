const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Game configuration
const GAME_CONFIG = {
  canvasWidth: 800,
  canvasHeight: 600,
  playerWidth: 40,
  playerHeight: 60,
  gravity: 0.6,  // Reduced gravity for better feel
  jumpForce: 12, // Adjusted jump force  
  moveSpeed: 4,  // Slightly reduced for better control
  attackRange: 60,
  attackDamage: 10,
  attackCooldown: 500,
};

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global game state
let gameRooms = new Map();

// Utility functions
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createPlayer(socketId, name, playerIndex) {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b'];
  const x = playerIndex === 0 ? GAME_CONFIG.canvasWidth * 0.25 : GAME_CONFIG.canvasWidth * 0.75;
  const y = GAME_CONFIG.canvasHeight * 0.25;
  
  return {
    id: socketId,
    name,
    position: { x, y },
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

function findPlayerRoom(playerId) {
  for (const room of gameRooms.values()) {
    if (room.players[playerId]) {
      return room;
    }
  }
  return null;
}

function checkAttackHit(attacker, target) {
  const distance = Math.abs(attacker.position.x - target.position.x);
  const verticalDistance = Math.abs(attacker.position.y - target.position.y);
  
  return distance <= GAME_CONFIG.attackRange && verticalDistance <= GAME_CONFIG.playerHeight;
}

function applyDamage(player, damage) {
  const newHealth = Math.max(0, player.health - damage);
  return {
    ...player,
    health: newHealth,
    isAlive: newHealth > 0
  };
}

function checkGameEnd(players) {
  const alivePlayers = Object.values(players).filter(player => player.isAlive);
  
  if (alivePlayers.length <= 1) {
    return alivePlayers.length === 1 ? alivePlayers[0].id : 'draw';
  }
  
  return null;
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
  });

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('createRoom', () => {
      const roomId = generateRoomId();
      const newRoom = {
        id: roomId,
        players: {},
        gameState: 'waiting',
        createdAt: new Date(),
        maxPlayers: 2,
        currentPlayers: 0,
      };

      gameRooms.set(roomId, newRoom);
      socket.emit('roomCreated', roomId);
      console.log('Room created:', roomId);
    });

    socket.on('joinRoom', (roomId, playerName) => {
      const room = gameRooms.get(roomId);
      
      if (!room) {
        socket.emit('roomNotFound');
        return;
      }

      if (room.currentPlayers >= room.maxPlayers) {
        socket.emit('roomFull');
        return;
      }

      const playerIndex = Object.keys(room.players).length;
      const player = createPlayer(socket.id, playerName, playerIndex);
      
      room.players[socket.id] = player;
      room.currentPlayers++;

      socket.join(roomId);
      socket.emit('roomJoined', room);
      socket.to(roomId).emit('playerJoined', player);

      if (room.currentPlayers === room.maxPlayers) {
        room.gameState = 'ready';
        io.to(roomId).emit('gameStateChanged', room.gameState);
        
        setTimeout(() => {
          room.gameState = 'in_progress';
          room.gameStartTime = new Date();
          io.to(roomId).emit('gameStarted');
          io.to(roomId).emit('gameUpdate', room);
        }, 2000);
      }

      console.log(`Player ${playerName} joined room ${roomId}`);
    });

    socket.on('playerMove', (position, velocity, controls) => {
      const playerRoom = findPlayerRoom(socket.id);
      if (!playerRoom || playerRoom.gameState !== 'in_progress') return;

      const player = playerRoom.players[socket.id];
      if (!player || !player.isAlive) return;

      player.position = position;
      player.velocity = velocity;
      player.isJumping = !player.isGrounded;
      
      if (velocity.x > 0) {
        player.facingDirection = 'right';
      } else if (velocity.x < 0) {
        player.facingDirection = 'left';
      }

      // Keep player in bounds
      const playerWidth = GAME_CONFIG.playerWidth;
      if (player.position.x < playerWidth / 2) {
        player.position.x = playerWidth / 2;
      } else if (player.position.x > GAME_CONFIG.canvasWidth - playerWidth / 2) {
        player.position.x = GAME_CONFIG.canvasWidth - playerWidth / 2;
      }

      socket.to(playerRoom.id).emit('playerMoved', socket.id, position, velocity);
      io.to(playerRoom.id).emit('gameUpdate', playerRoom);
    });

    socket.on('playerAttack', () => {
      const playerRoom = findPlayerRoom(socket.id);
      if (!playerRoom || playerRoom.gameState !== 'in_progress') return;

      const attacker = playerRoom.players[socket.id];
      if (!attacker || !attacker.isAlive) return;

      const currentTime = Date.now();
      if (currentTime - attacker.lastAttackTime < GAME_CONFIG.attackCooldown) return;

      attacker.isAttacking = true;
      attacker.lastAttackTime = currentTime;

      let targetHit;
      Object.entries(playerRoom.players).forEach(([playerId, player]) => {
        if (playerId !== socket.id && player.isAlive) {
          if (checkAttackHit(attacker, player)) {
            const damagedPlayer = applyDamage(player, GAME_CONFIG.attackDamage);
            playerRoom.players[playerId] = damagedPlayer;
            
            // Simple knockback
            const direction = attacker.position.x < player.position.x ? 1 : -1;
            player.position.x += direction * 20;
            
            targetHit = playerId;
            io.to(playerRoom.id).emit('playerHealthChanged', playerId, damagedPlayer.health);
          }
        }
      });

      io.to(playerRoom.id).emit('playerAttacked', socket.id, targetHit);
      
      const winner = checkGameEnd(playerRoom.players);
      if (winner) {
        playerRoom.gameState = 'finished';
        playerRoom.winner = winner;
        io.to(playerRoom.id).emit('gameEnded', winner);
      }

      setTimeout(() => {
        if (playerRoom.players[socket.id]) {
          playerRoom.players[socket.id].isAttacking = false;
        }
      }, 300);

      io.to(playerRoom.id).emit('gameUpdate', playerRoom);
    });

    socket.on('playerReady', () => {
      const playerRoom = findPlayerRoom(socket.id);
      if (!playerRoom) return;

      if (playerRoom.currentPlayers === playerRoom.maxPlayers && playerRoom.gameState === 'ready') {
        playerRoom.gameState = 'in_progress';
        playerRoom.gameStartTime = new Date();
        io.to(playerRoom.id).emit('gameStarted');
        io.to(playerRoom.id).emit('gameUpdate', playerRoom);
      }
    });

    socket.on('leaveRoom', () => {
      handlePlayerDisconnect(socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      handlePlayerDisconnect(socket.id);
    });
  });

  function handlePlayerDisconnect(playerId) {
    const playerRoom = findPlayerRoom(playerId);
    if (!playerRoom) return;

    delete playerRoom.players[playerId];
    playerRoom.currentPlayers--;

    io.to(playerRoom.id).emit('playerLeft', playerId);
    io.to(playerRoom.id).emit('playerDisconnected', playerId);

    if (playerRoom.currentPlayers === 0) {
      gameRooms.delete(playerRoom.id);
      console.log('Room deleted:', playerRoom.id);
    } else if (playerRoom.gameState === 'in_progress') {
      const remainingPlayer = Object.keys(playerRoom.players)[0];
      playerRoom.gameState = 'finished';
      playerRoom.winner = remainingPlayer;
      io.to(playerRoom.id).emit('gameEnded', remainingPlayer);
    }
  }

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});