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
  const y = GAME_CONFIG.canvasHeight - 80; // Start near bottom of canvas (ground level)
  
  console.log(`🎮 Creating player ${playerIndex} at position (${x}, ${y})`);
  
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
    // Vorld integration - equipped items
    equippedWeapon: null,
    equippedShield: null,
    attackDamage: GAME_CONFIG.attackDamage,
    attackRange: GAME_CONFIG.attackRange,
    defense: 0,
    moveSpeedMultiplier: 1.0,
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
  
  // Use weapon-specific range if available, otherwise use default
  const attackRange = attacker.attackRange || GAME_CONFIG.attackRange;
  
  return distance <= attackRange && verticalDistance <= GAME_CONFIG.playerHeight;
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
        // Vorld integration - items in arena
        droppedItems: {},
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

      // Check for automatic weapon pickup when player moves
      checkForAutoPickup(socket.id, playerRoom);

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
            // Calculate damage considering weapon and defense
            let damage = attacker.attackDamage || GAME_CONFIG.attackDamage;
            damage = Math.max(1, damage - (player.defense || 0)); // Minimum 1 damage
            
            const damagedPlayer = applyDamage(player, damage);
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

    // Vorld integration - Item handling
    socket.on('itemDropped', (item) => {
      const playerRoom = findPlayerRoom(socket.id);
      if (!playerRoom) return;

      // Add item to room's dropped items
      playerRoom.droppedItems[item.id] = item;
      
      // Notify all players in the room about the new item
      io.to(playerRoom.id).emit('itemDropped', item);
      io.to(playerRoom.id).emit('gameUpdate', playerRoom);
      
      console.log('Item dropped in room:', playerRoom.id, item.name);
    });

    socket.on('pickupItem', (itemId) => {
      const playerRoom = findPlayerRoom(socket.id);
      if (!playerRoom || !playerRoom.droppedItems[itemId]) return;

      const item = playerRoom.droppedItems[itemId];
      const player = playerRoom.players[socket.id];
      
      if (!player || !player.isAlive) return;

      // Check if player is close enough to pick up the item
      const distance = Math.sqrt(
        Math.pow(player.position.x - item.position.x, 2) + 
        Math.pow(player.position.y - item.position.y, 2)
      );
      
      console.log('🔍 Pickup attempt:', {
        playerId: socket.id,
        playerPos: player.position,
        itemPos: item.position,
        distance: distance,
        itemName: item.name
      });
      
      if (distance <= 45) { // Players must be close to pick up
        // Remove item from dropped items
        delete playerRoom.droppedItems[itemId];
        
        // Apply item effects based on type
        if (item.type === 'weapon') {
          // Automatically equip weapon when picked up
          player.equippedWeapon = item;
          player.attackDamage = GAME_CONFIG.attackDamage + (item.properties.attack || 0);
          
          // Update attack range if weapon has special range
          if (item.weaponInfo && item.weaponInfo.range) {
            player.attackRange = item.weaponInfo.range;
          }
          
          io.to(playerRoom.id).emit('itemEquipped', socket.id, item);
          console.log('Player', socket.id, 'equipped weapon:', item.name, 'Attack:', player.attackDamage);
        } else if (item.type === 'shield') {
          // Automatically equip shield when picked up
          player.equippedShield = item;
          player.defense = item.properties.defense || 0;
          
          io.to(playerRoom.id).emit('itemEquipped', socket.id, item);
          console.log('Player', socket.id, 'equipped shield:', item.name, 'Defense:', player.defense);
        } else if (item.type === 'consumable') {
          // Apply consumable effects immediately
          if (item.properties.heal) {
            player.health = Math.min(player.maxHealth, player.health + item.properties.heal);
            io.to(playerRoom.id).emit('playerHealthChanged', socket.id, player.health);
          }
          if (item.properties.speedBoost) {
            player.moveSpeedMultiplier = item.properties.speedBoost;
            // Reset speed boost after duration
            setTimeout(() => {
              if (playerRoom.players[socket.id]) {
                playerRoom.players[socket.id].moveSpeedMultiplier = 1.0;
              }
            }, item.properties.duration || 10000);
          }
        }
        
        // Notify all players about pickup
        io.to(playerRoom.id).emit('itemPickedUp', socket.id, itemId);
        io.to(playerRoom.id).emit('gameUpdate', playerRoom);
        
        console.log('Player', socket.id, 'picked up item:', item.name);
      }
    });

    socket.on('equipItem', (itemId, slot) => {
      const playerRoom = findPlayerRoom(socket.id);
      if (!playerRoom || !playerRoom.droppedItems[itemId]) return;

      const item = playerRoom.droppedItems[itemId];
      const player = playerRoom.players[socket.id];
      
      if (!player || !player.isAlive) return;

      // Equip item to the specified slot
      if (slot === 'weapon' && item.type === 'weapon') {
        player.equippedWeapon = item;
        player.attackDamage = GAME_CONFIG.attackDamage + (item.properties.attack || 0);
        
        // Remove from dropped items
        delete playerRoom.droppedItems[itemId];
        
        io.to(playerRoom.id).emit('itemEquipped', socket.id, item);
        io.to(playerRoom.id).emit('gameUpdate', playerRoom);
        
        console.log('Player', socket.id, 'equipped weapon:', item.name);
      } else if (slot === 'shield' && item.type === 'shield') {
        player.equippedShield = item;
        player.defense = item.properties.defense || 0;
        
        // Remove from dropped items
        delete playerRoom.droppedItems[itemId];
        
        io.to(playerRoom.id).emit('itemEquipped', socket.id, item);
        io.to(playerRoom.id).emit('gameUpdate', playerRoom);
        
        console.log('Player', socket.id, 'equipped shield:', item.name);
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

  function checkForAutoPickup(playerId, playerRoom) {
    const player = playerRoom.players[playerId];
    if (!player || !player.isAlive) {
      return;
    }

    // Only log occasionally to reduce spam
    const shouldLog = Math.random() < 0.01; // 1% chance
    if (shouldLog) {
      console.log(`🔍 Checking pickup for ${player.name} at (${player.position.x}, ${player.position.y})`);
      console.log(`🎒 Available items:`, Object.keys(playerRoom.droppedItems));
    }

    // Check all dropped items for proximity
    Object.entries(playerRoom.droppedItems).forEach(([itemId, item]) => {
      const distance = Math.sqrt(
        Math.pow(player.position.x - item.position.x, 2) + 
        Math.pow(player.position.y - item.position.y, 2)
      );

      if (shouldLog) {
        console.log(`📏 Distance to ${item.name}: ${distance} (pickup range: 100)`);
      }

      if (distance <= 50) { // Allow modest auto-pickup radius
        console.log(`🚀 AUTO-PICKUP TRIGGERED: ${player.name} found ${item.name} at distance ${distance}`);
        
        // Remove item from dropped items
        delete playerRoom.droppedItems[itemId];
        
        // Apply item effects based on type
        if (item.type === 'weapon') {
          player.equippedWeapon = item;
          player.attackDamage = GAME_CONFIG.attackDamage + (item.properties.attack || 0);
          
          if (item.weaponInfo && item.weaponInfo.range) {
            player.attackRange = item.weaponInfo.range;
          }
          
          io.to(playerRoom.id).emit('itemEquipped', playerId, item);
          io.to(playerRoom.id).emit('itemPickedUp', playerId, itemId);
          console.log('🗡️ Player', playerId, 'auto-equipped weapon:', item.name);
        }
        
        // Update game state
        io.to(playerRoom.id).emit('gameUpdate', playerRoom);
      }
    });
  }

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
