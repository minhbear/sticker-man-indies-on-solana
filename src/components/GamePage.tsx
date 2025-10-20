'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import GameLobby from '@/components/GameLobby';
import GameArena from '@/components/GameArena';
import BoostSystem from '@/components/BoostSystem';
import ItemDropSystem from '@/components/ItemDropSystem';
import { GameRoom, GameState, GameConfig, Position, Velocity, Controls, DroppedItem } from '@/types/game';
import gameSocketService from '@/services/gameSocket';
import { useGameControls } from '@/hooks/useGameControls';
import { ArenaGameService, PackageDrop, ItemDrop, GameState as ArenaGameState, BoostData } from '@/services/arenaGameService';
import { UserProfile } from '@/libs/Vorld/authService';
import { WeaponManager, WEAPON_SPAWN_CONFIG } from '@/config/weapons';

// Game configuration
const GAME_CONFIG: GameConfig = {
  canvasWidth: 800,
  canvasHeight: 600,
  playerWidth: 40,
  playerHeight: 60,
  gravity: 0.6,  // Reduced gravity for better feel
  jumpForce: 12, // Adjusted jump force
  moveSpeed: 4,  // Slightly reduced for better control
  attackRange: 60,
  attackDamage: 10,
  attackCooldown: 500, // milliseconds
};

type GamePageState = 'lobby' | 'waiting' | 'playing';

interface GamePageProps {
  userProfile: UserProfile | null;
  userToken: string;
  arenaService: ArenaGameService | null;
}

export default function GamePage({ userProfile, userToken, arenaService }: GamePageProps) {
  const [gameState, setGameState] = useState<GamePageState>('lobby');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string>('https://twitch.tv/your_channel_name');
  const [arenaGameState, setArenaGameState] = useState<ArenaGameState | null>(arenaService?.getGameState() ?? null);
  const [isInitializingArena, setIsInitializingArena] = useState(false);
  const [arenaInitError, setArenaInitError] = useState('');
  const [boostHistory, setBoostHistory] = useState<Array<BoostData & { timestamp?: string }>>([]);
  const [itemDropHistory, setItemDropHistory] = useState<Array<ItemDrop & { newBalance?: number }>>([]);
  
  // Vorld Arena integration
  const [isVorldConnected, setIsVorldConnected] = useState(false);
  
  // Weapon spawn system
  const [weaponSpawnTimer, setWeaponSpawnTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastWeaponSpawn, setLastWeaponSpawn] = useState<string>('');

  // Game controls
  const isGameActive = gameState === 'playing' && room?.gameState === GameState.IN_PROGRESS;
  
  useEffect(() => {
    if (!arenaService) {
      setArenaGameState(null);
      return;
    }
    setArenaGameState(arenaService.getGameState());
  }, [arenaService]);
  
  const handlePlayerMove = useCallback((position: Position, velocity: Velocity, controls: Controls) => {
    if (isGameActive && gameSocketService.connected) {
      // Only log occasionally to reduce spam
      if (Math.random() < 0.1) { // 10% chance to log with actual values
        console.log('📡 Player move with values:', { 
          playerId, 
          position: `(${Math.round(position.x)}, ${Math.round(position.y)})`, 
          velocity: `(${Math.round(velocity.x)}, ${Math.round(velocity.y)})`, 
          controls 
        });
      }
      gameSocketService.sendPlayerMove(position, velocity, controls);
    } else {
      console.log('❌ Cannot send move - game not active or not connected:', { 
        isGameActive, 
        connected: gameSocketService.connected,
        playerId 
      });
    }
  }, [isGameActive, playerId]);

  const handlePlayerAttack = useCallback(() => {
    if (isGameActive && gameSocketService.connected) {
      gameSocketService.sendPlayerAttack();
    }
  }, [isGameActive]);

  const handlePickupItem = useCallback((itemId: string) => {
    if (gameSocketService.connected) {
      gameSocketService.sendPickupItem(itemId);
    }
  }, []);

  const handleBoostSuccess = useCallback((data: BoostData) => {
    setBoostHistory(prev => {
      const entry = {
        ...data,
        timestamp: (data as unknown as { timestamp?: string })?.timestamp || new Date().toISOString()
      };
      return [entry, ...prev].slice(0, 20);
    });
  }, []);

  const handleItemDropSuccess = useCallback((data: ItemDrop) => {
    setItemDropHistory(prev => {
      const entry = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
      return [entry, ...prev].slice(0, 20);
    });
  }, []);

  const handleInitializeArenaGame = useCallback(async () => {
    if (!arenaService) {
      setArenaInitError('Arena service not available');
      return;
    }

    setIsInitializingArena(true);
    setArenaInitError('');

    try {
      const result = await arenaService.initializeGame(streamUrl);
      if (result.success && result.data) {
        setArenaGameState(result.data);
        setIsVorldConnected(true);
        console.log('Arena game initialized:', result.data.gameId);
      } else {
        setArenaInitError(result.error || 'Failed to initialize Arena game');
      }
    } catch (err) {
      console.error('Arena initialization failed:', err);
      setArenaInitError('Unexpected error during Arena initialization');
    } finally {
      setIsInitializingArena(false);
    }
  }, [arenaService, streamUrl]);

  const currentPlayer = useMemo(() => {
    if (!playerId || !room?.players) {
      return null;
    }
    return room.players[playerId] ?? null;
  }, [playerId, room]);

  // Use game controls - ensure playerId exists
  const gameControls = useGameControls({
    onMove: handlePlayerMove,
    onAttack: handlePlayerAttack,
    gameConfig: GAME_CONFIG,
    isGameActive: isGameActive, // Simplified - just use isGameActive
    playerId: playerId || 'player1', // Fallback playerId
    initialPosition: currentPlayer?.position ?? null
  });

  // Debug controls
  useEffect(() => {
    console.log('🎮 Game controls state:', {
      playerId,
      isGameActive,
      controlsActive: isGameActive,
      hasPlayerId: !!playerId,
      controls: gameControls?.currentControls,
      position: gameControls?.currentPosition
    });
  }, [playerId, isGameActive, gameControls?.currentControls, gameControls?.currentPosition]);

  // Spawn a random weapon function
  const spawnRandomWeapon = useCallback(() => {
    const weapon = WeaponManager.getRandomWeapon();
    const droppedWeapon = WeaponManager.createDroppedWeapon(weapon);
    
    console.log(`🗡️ Spawning weapon: ${weapon.name} at position (${droppedWeapon.position.x}, ${droppedWeapon.position.y})`);
    
    // Show notification
    setError(`⚔️ ${weapon.name} spawned! Look for the ${weapon.icon}`);
    setTimeout(() => setError(''), 3000);
    
    // Send weapon drop to server
    if (gameSocketService.connected) {
      gameSocketService.sendItemDrop(droppedWeapon);
    } else {
      console.log('❌ GameSocket not connected, cannot spawn weapon');
    }
  }, []);

  // Weapon spawn timer function
  const startWeaponSpawnTimer = useCallback(() => {
    console.log('🎯 Starting weapon spawn timer...');
    
    // Clear any existing timer
    if (weaponSpawnTimer) {
      clearInterval(weaponSpawnTimer);
    }

    // Start new timer to spawn weapons every 10 seconds for testing
    const timer = setInterval(() => {
      console.log('⏰ Timer tick - checking game state:', gameState, room?.gameState);
      if (gameState === 'playing' && room?.gameState === GameState.IN_PROGRESS) {
        console.log('✅ Conditions met, spawning weapon!');
        spawnRandomWeapon();
      } else {
        console.log('❌ Conditions not met for weapon spawn');
      }
    }, 10000); // 10 seconds for faster testing

    setWeaponSpawnTimer(timer);
  }, [gameState, room?.gameState, weaponSpawnTimer, spawnRandomWeapon]);

  // Clean up weapon timer on unmount or game end
  useEffect(() => {
    return () => {
      if (weaponSpawnTimer) {
        clearInterval(weaponSpawnTimer);
      }
    };
  }, [weaponSpawnTimer]);

  // Handle room joined
  const handleRoomJoined = useCallback((roomId: string) => {
    setPlayerId(gameSocketService.socketId || '');
    setGameState('waiting');
    setError('');
  }, []);

  // Handle error
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(''), 5000); // Clear error after 5 seconds
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!gameSocketService.connected) return;

    // Game update events
    gameSocketService.onGameUpdate((updatedRoom: GameRoom) => {
      setRoom(updatedRoom);
      
      // Update game state based on room state
      if (updatedRoom.gameState === GameState.IN_PROGRESS) {
        setGameState('playing');
      } else if (updatedRoom.gameState === GameState.WAITING) {
        setGameState('waiting');
      }
    });

    // Player events
    gameSocketService.onPlayerJoined((player) => {
      console.log('Player joined:', player.name);
    });

    gameSocketService.onPlayerLeft((playerId) => {
      console.log('Player left:', playerId);
      // Handle player disconnect
      if (gameState === 'playing') {
        handleError('Your opponent disconnected');
        setTimeout(() => {
          setGameState('lobby');
          setRoom(null);
        }, 3000);
      }
    });

    gameSocketService.onGameStarted(() => {
      setGameState('playing');
      
      // Spawn a weapon immediately for testing
      setTimeout(() => {
        console.log('🚀 Game started, spawning first weapon immediately!');
        spawnRandomWeapon();
      }, 2000); // 2 seconds after game starts
      
      // Start weapon spawn timer for future weapons
      startWeaponSpawnTimer();
    });

    gameSocketService.onGameEnded((winner) => {
      console.log('Game ended, winner:', winner);
      // Stop weapon spawn timer when game ends
      if (weaponSpawnTimer) {
        clearInterval(weaponSpawnTimer);
        setWeaponSpawnTimer(null);
      }
      // Game end is handled by the GameArena component
    });

    gameSocketService.onPlayerDisconnected((playerId) => {
      console.log('Player disconnected:', playerId);
      handleError('Player disconnected');
    });

    // Vorld integration - Item event listeners
    gameSocketService.onItemDropped((item) => {
      console.log('Item dropped:', item);
      // Item will be automatically included in room updates
    });

    gameSocketService.onItemPickedUp((playerId, itemId) => {
      console.log('Item picked up by:', playerId, itemId);
    });

    gameSocketService.onItemEquipped((playerId, item) => {
      console.log('Item equipped by:', playerId, item);
    });

    // Connection status
    setIsConnected(gameSocketService.connected);

    // Cleanup function
    return () => {
      gameSocketService.removeAllListeners();
    };
  }, [gameState, handleError]);

  // Handle page unload - disconnect from game
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gameSocketService.connected) {
        gameSocketService.leaveRoom();
        gameSocketService.disconnect();
      }
      if (arenaService) {
        arenaService.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [arenaService]);

  // Initialize Vorld Arena when game starts
  useEffect(() => {
    if (gameState === 'playing' && room?.gameState === GameState.IN_PROGRESS && arenaService) {
      // Connect to Vorld Arena for viewer interactions
      arenaService.connectToArena(room.id)
        .then(() => {
          setIsVorldConnected(true);
          console.log('Connected to Vorld Arena for room:', room.id);
        })
        .catch((error: any) => {
          console.error('Failed to connect to Vorld Arena:', error);
          setError('Failed to connect to streaming platform');
        });

      // Vorld boost events
      arenaService.onPlayerBoostActivated = (boostData: BoostData) => {
        console.log('Player boost activated via Vorld:', boostData);
        setBoostHistory(prev => {
          const entry = {
            ...boostData,
            timestamp: (boostData as unknown as { timestamp?: string })?.timestamp || new Date().toISOString()
          };
          return [entry, ...prev].slice(0, 20);
        });
      };

      // Setup item drop handlers
      arenaService.onPackageDrop = (packageData: PackageDrop) => {
        console.log('Package dropped by viewer:', packageData);
        setItemDropHistory(prev => {
          const entries = packageData.items.map((item) => ({
            ...item,
            timestamp: item.timestamp || packageData.timestamp
          }));
          return [...entries, ...prev].slice(0, 20);
        });
        
        // Process each item in the package
        packageData.items.forEach((item: ItemDrop) => {
          const droppedItem: DroppedItem = {
            id: `vorld_${item.itemId}_${Date.now()}`,
            type: item.metadata?.damage ? 'weapon' : item.metadata?.defense ? 'shield' : 'consumable',
            name: item.itemName,
            position: {
              x: Math.random() * (GAME_CONFIG.canvasWidth - 100) + 50,
              y: GAME_CONFIG.canvasHeight - 200
            },
            properties: {
              attack: item.metadata?.damage,
              defense: item.metadata?.defense,
              heal: item.metadata?.speed,
              speedBoost: item.metadata?.speed
            },
            icon: '🎁', // Default package icon
            droppedBy: item.targetPlayer,
            droppedAt: Date.now()
          };

          // Send item drop to server
          if (gameSocketService.connected) {
            gameSocketService.sendItemDrop(droppedItem);
          }
        });
      };

      arenaService.onImmediateItemDrop = (itemData: ItemDrop) => {
        console.log('Immediate item dropped:', itemData);
        setItemDropHistory(prev => {
          const entry = {
            ...itemData,
            timestamp: itemData.timestamp || new Date().toISOString()
          };
          return [entry, ...prev].slice(0, 20);
        });
        
        const droppedItem: DroppedItem = {
          id: `immediate_${itemData.itemId}_${Date.now()}`,
          type: 'consumable',
          name: itemData.itemName,
          position: {
            x: Math.random() * (GAME_CONFIG.canvasWidth - 100) + 50,
            y: GAME_CONFIG.canvasHeight - 200
          },
          properties: {
            heal: itemData.metadata?.speed,
            speedBoost: itemData.metadata?.speed,
            duration: 10000 // 10 seconds
          },
          icon: '⚡', // Power-up icon
          droppedBy: itemData.targetPlayer,
          droppedAt: Date.now()
        };

        // Send immediate item drop to server
        if (gameSocketService.connected) {
          gameSocketService.sendItemDrop(droppedItem);
        }
      };
    }

    // Cleanup when leaving game
    return () => {
      if (arenaService) {
        arenaService.onPlayerBoostActivated = undefined;
        arenaService.onPackageDrop = undefined;
        arenaService.onImmediateItemDrop = undefined;
        if (gameState !== 'playing') {
          arenaService.disconnect();
          setIsVorldConnected(false);
        }
      }
    };
  }, [gameState, room?.gameState, room?.id, arenaService]);

  // Handle back to lobby
  const handleBackToLobby = useCallback(() => {
    if (gameSocketService.connected) {
      gameSocketService.leaveRoom();
    }
    setGameState('lobby');
    setRoom(null);
    setPlayerId('');
    setError('');
  }, []);

  // Render error toast
  const renderError = () => {
    if (!error) return null;

    return (
              <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
    );
  };

  // Render connection status
  const renderConnectionStatus = () => {
    return (
      <div className="fixed top-4 left-4 z-50 space-y-2">
        {/* Game Server Connection */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>Game: {isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        {/* Vorld Arena Connection */}
        {gameState === 'playing' && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isVorldConnected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isVorldConnected ? 'bg-blue-500' : 'bg-gray-400'
            }`} />
            <span>Streaming: {isVorldConnected ? 'Live' : 'Offline'}</span>
          </div>
        )}
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gray-900">
      {renderConnectionStatus()}
      {renderError()}

      {gameState === 'lobby' && (
        <GameLobby
          onRoomJoined={handleRoomJoined}
          onError={handleError}
        />
      )}

      {(gameState === 'waiting' || gameState === 'playing') && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          {/* Header */}
          <div className="mb-4 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">🥊 Sticker Fight</h1>
            {room && (
              <div className="flex items-center gap-4 text-white">
                <div className="bg-gray-800 px-4 py-2 rounded-lg">
                  <span className="text-sm">Room ID: </span>
                  <span className="font-mono font-bold text-yellow-400">{room.id}</span>
                </div>
                <div className="bg-gray-800 px-4 py-2 rounded-lg text-sm">
                  Players: {room.currentPlayers}/{room.maxPlayers}
                </div>
              </div>
            )}
          </div>

          {/* Game Arena */}
          <div className="mb-4">
            <GameArena
              room={room}
              config={GAME_CONFIG}
              playerId={playerId}
              onPickupItem={handlePickupItem}
            />
          </div>

          {/* Game Controls */}
          <div className="flex gap-4">
            <button
              onClick={handleBackToLobby}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Leave Game
            </button>
            
            {room && room.currentPlayers >= 2 && room.gameState === GameState.WAITING && (
              <button
                onClick={() => gameSocketService.sendPlayerReady()}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Ready to Fight!
              </button>
            )}
            
            {/* Debug buttons for testing */}
            {isGameActive && (
              <div className="flex gap-2 mt-2 flex-wrap">
                <button
                  onClick={spawnRandomWeapon}
                  className="bg-purple-600 text-white px-4 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
                >
                  🗡️ Spawn Weapon
                </button>
                <button
                  onClick={() => {
                    console.log('🔍 Debug info:', {
                      playerId,
                      gameState: room?.gameState,
                      droppedItems: room?.droppedItems,
                      players: room?.players,
                      myPosition: gameControls?.currentPosition
                    });
                  }}
                  className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  🐛 Debug
                </button>
                <button
                  onClick={() => {
                    // Test movement manually - use ground level coordinates
                    handlePlayerMove(
                      { x: 200, y: GAME_CONFIG.canvasHeight - 80 }, 
                      { x: 0, y: 0 }, 
                      { left: false, right: false, jump: false, attack: false }
                    );
                    console.log('🧪 Manual move test sent to ground level');
                  }}
                  className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  🧪 Test Move
                </button>
                <button
                  onClick={() => {
                    // Force left movement
                    handlePlayerMove(
                      { x: Math.max(50, (gameControls?.currentPosition?.x || 200) - 50), y: GAME_CONFIG.canvasHeight - 80 }, 
                      { x: -4, y: 0 }, 
                      { left: true, right: false, jump: false, attack: false }
                    );
                    console.log('⬅️ Force move left');
                  }}
                  className="bg-orange-600 text-white px-4 py-1 rounded text-sm hover:bg-orange-700 transition-colors"
                >
                  ⬅️ Move Left
                </button>
                <button
                  onClick={() => {
                    // Force right movement
                    handlePlayerMove(
                      { x: Math.min(750, (gameControls?.currentPosition?.x || 200) + 50), y: GAME_CONFIG.canvasHeight - 80 }, 
                      { x: 4, y: 0 }, 
                      { left: false, right: true, jump: false, attack: false }
                    );
                    console.log('➡️ Force move right');
                  }}
                  className="bg-orange-600 text-white px-4 py-1 rounded text-sm hover:bg-orange-700 transition-colors"
                >
                  ➡️ Move Right
                </button>
              </div>
            )}
            
            {/* Position display for debugging */}
            {isGameActive && gameControls?.currentPosition && (
              <div className="mt-2 text-xs text-gray-300 font-mono">
                Position: ({Math.round(gameControls.currentPosition.x)}, {Math.round(gameControls.currentPosition.y)})
              </div>
            )}
          </div>

          {/* Room sharing */}
          {room && room.currentPlayers < 2 && (
            <div className="mt-4 bg-gray-800 text-white p-4 rounded-lg text-center max-w-md">
              <p className="mb-2 text-sm">Share this room code with a friend:</p>
              <div className="font-mono text-xl font-bold text-yellow-400 mb-2">
                {room.id}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(room.id)}
                className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Copy Room Code
              </button>
            </div>
          )}

          {arenaService && (
            <div className="w-full max-w-5xl mt-10 space-y-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                      🌐 Arena Arcade Integration
                    </h2>
                    <p className="text-sm text-gray-400">
                      Initialize the Arena game with your stream URL to enable viewer boosts and live item drops.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-3 py-1 rounded-full border border-gray-600 text-gray-300">
                      {arenaGameState ? `Arena ID: ${arenaGameState.gameId}` : 'Arena inactive'}
                    </span>
                    <span className={`px-3 py-1 rounded-full border text-sm ${
                      isVorldConnected ? 'border-green-500 text-green-300' : 'border-gray-600 text-gray-400'
                    }`}>
                      {isVorldConnected ? 'Streaming Connected' : 'Streaming Offline'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm text-gray-300">Stream URL</span>
                    <input
                      type="url"
                      value={streamUrl}
                      onChange={(event) => setStreamUrl(event.target.value)}
                      placeholder="https://twitch.tv/your_channel_name"
                      className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <button
                    onClick={handleInitializeArenaGame}
                    disabled={isInitializingArena}
                    className="self-end bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/60 disabled:cursor-not-allowed text-white font-medium px-5 py-2 rounded-lg transition-colors"
                  >
                    {isInitializingArena ? 'Initializing...' : 'Initialize Arena Game'}
                  </button>
                </div>

                {arenaInitError && (
                  <div className="text-sm text-red-400">
                    {arenaInitError}
                  </div>
                )}

                {arenaGameState && (
                  <div className="grid gap-3 text-sm text-gray-300 sm:grid-cols-3">
                    <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-3">
                      <p className="text-gray-400 text-xs uppercase">Status</p>
                      <p className="text-white font-semibold">{arenaGameState.status}</p>
                    </div>
                    <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-3">
                      <p className="text-gray-400 text-xs uppercase">Expires</p>
                      <p className="text-white font-semibold">
                        {new Date(arenaGameState.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-3">
                      <p className="text-gray-400 text-xs uppercase">Arena Active</p>
                      <p className={`font-semibold ${arenaGameState.arenaActive ? 'text-green-400' : 'text-gray-300'}`}>
                        {arenaGameState.arenaActive ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {arenaGameState ? (
                <div className="space-y-6">
                  <BoostSystem
                    gameService={arenaService}
                    gameState={arenaGameState}
                    boostHistory={boostHistory}
                    onBoostSuccess={handleBoostSuccess}
                  />
                  <ItemDropSystem
                    gameService={arenaService}
                    gameState={arenaGameState}
                    dropHistory={itemDropHistory}
                    onItemDropSuccess={handleItemDropSuccess}
                  />
                </div>
              ) : (
                <div className="bg-gray-800 border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-400 text-sm">
                  Initialize the Arena game to unlock boost controls and item drops.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
