'use client';

import React, { useState, useEffect, useCallback } from 'react';
import GameLobby from '@/components/GameLobby';
import GameArena from '@/components/GameArena';
import { GameRoom, GameState, GameConfig, Position, Velocity, Controls } from '@/types/game';
import gameSocketService from '@/services/gameSocket';
import { useGameControls } from '@/hooks/useGameControls';

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

export default function GamePage() {
  const [gameState, setGameState] = useState<GamePageState>('lobby');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  // Game controls
  const isGameActive = gameState === 'playing' && room?.gameState === GameState.IN_PROGRESS;
  
  const handlePlayerMove = useCallback((position: Position, velocity: Velocity, controls: Controls) => {
    if (isGameActive && gameSocketService.connected) {
      gameSocketService.sendPlayerMove(position, velocity, controls);
    }
  }, [isGameActive]);

  const handlePlayerAttack = useCallback(() => {
    if (isGameActive && gameSocketService.connected) {
      gameSocketService.sendPlayerAttack();
    }
  }, [isGameActive]);

  // Use game controls
  useGameControls({
    onMove: handlePlayerMove,
    onAttack: handlePlayerAttack,
    gameConfig: GAME_CONFIG,
    isGameActive,
    playerId
  });

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
    });

    gameSocketService.onGameEnded((winner) => {
      console.log('Game ended, winner:', winner);
      // Game end is handled by the GameArena component
    });

    gameSocketService.onPlayerDisconnected((playerId) => {
      console.log('Player disconnected:', playerId);
      handleError('Player disconnected');
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
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

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
      <div className="fixed top-4 left-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
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
        </div>
      )}
    </div>
  );
}