'use client';

import React, { useRef, useEffect } from 'react';
import { GameRoom, GameConfig } from '@/types/game';
import StickerMan from './StickerMan';

interface GameArenaProps {
  room: GameRoom | null;
  config: GameConfig;
  playerId: string;
}

export const GameArena: React.FC<GameArenaProps> = ({ room, config, playerId }) => {
  const arenaRef = useRef<HTMLDivElement>(null);

  const { canvasWidth, canvasHeight } = config;

  // Background elements for the fighting arena
  const backgroundElements = (
    <>
      {/* Sky gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-blue-400 via-blue-200 to-green-200"
        style={{ height: `${canvasHeight * 0.7}px` }}
      />
      
      {/* Ground */}
      <div 
        className="absolute bottom-0 w-full bg-gradient-to-t from-green-600 to-green-400 border-t-4 border-green-800"
        style={{ height: `${canvasHeight * 0.3}px` }}
      />
      
      {/* Platform/Stage */}
      <div 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-gray-600 border-2 border-gray-800 rounded-t-lg"
        style={{ 
          width: `${canvasWidth * 0.8}px`, 
          height: '20px',
          bottom: `${canvasHeight * 0.25}px`
        }}
      />
      
      {/* Arena boundaries */}
      <div className="absolute left-0 top-0 w-4 h-full bg-gray-800 border-r-2 border-gray-600" />
      <div className="absolute right-0 top-0 w-4 h-full bg-gray-800 border-l-2 border-gray-600" />
      
      {/* Decorative clouds */}
      <div className="absolute top-10 left-10 w-16 h-8 bg-white rounded-full opacity-70" />
      <div className="absolute top-16 right-20 w-20 h-10 bg-white rounded-full opacity-70" />
      <div className="absolute top-8 right-1/3 w-12 h-6 bg-white rounded-full opacity-70" />
      
      {/* Mountains in background */}
      <div className="absolute bottom-1/3 left-8 w-24 h-32 bg-gray-500 opacity-40" 
           style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
      <div className="absolute bottom-1/3 right-8 w-32 h-40 bg-gray-600 opacity-40" 
           style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
    </>
  );

  return (
    <div className="relative bg-black rounded-lg overflow-hidden border-4 border-gray-700 shadow-2xl">
      {/* Arena Container */}
      <div
        ref={arenaRef}
        className="relative bg-transparent"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
        }}
      >
        {backgroundElements}
        
        {/* Game Stats Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
          {/* Left Player Stats */}
          {room && Object.values(room.players)[0] && (
            <div className="bg-black bg-opacity-50 text-white p-3 rounded-lg">
              <div className="font-bold text-lg">{Object.values(room.players)[0].name}</div>
              <div className="text-sm">Player 1</div>
              <div className="w-24 h-3 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{
                    width: `${(Object.values(room.players)[0].health / Object.values(room.players)[0].maxHealth) * 100}%`
                  }}
                />
              </div>
            </div>
          )}
          
          {/* Game State Display */}
          <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg text-center">
            <div className="text-sm font-bold">
              {room?.gameState.toUpperCase().replace('_', ' ')}
            </div>
            {room?.gameState === 'waiting' && (
              <div className="text-xs">Waiting for players...</div>
            )}
          </div>
          
          {/* Right Player Stats */}
          {room && Object.values(room.players)[1] && (
            <div className="bg-black bg-opacity-50 text-white p-3 rounded-lg text-right">
              <div className="font-bold text-lg">{Object.values(room.players)[1].name}</div>
              <div className="text-sm">Player 2</div>
              <div className="w-24 h-3 bg-gray-700 rounded-full mt-2 overflow-hidden ml-auto">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${(Object.values(room.players)[1].health / Object.values(room.players)[1].maxHealth) * 100}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Players */}
        {room && Object.values(room.players).map((player) => (
          <StickerMan
            key={player.id}
            player={player}
            scale={1}
          />
        ))}
        
        {/* Control Instructions */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white p-4 rounded-lg text-center text-sm">
          <div className="font-bold mb-2">Controls</div>
          <div className="flex gap-6 text-xs">
            <div>
              <div className="font-semibold">Move:</div>
              <div>A/D or ←/→</div>
            </div>
            <div>
              <div className="font-semibold">Jump:</div>
              <div>W or ↑</div>
            </div>
            <div>
              <div className="font-semibold">Attack:</div>
              <div>SPACE</div>
            </div>
          </div>
        </div>
        
        {/* Victory Screen Overlay */}
        {room?.gameState === 'finished' && room.winner && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-20">
            <div className="bg-white p-8 rounded-lg text-center">
              <div className="text-4xl font-bold mb-4">🏆</div>
              <div className="text-2xl font-bold mb-2">Victory!</div>
              <div className="text-lg">
                {room.players[room.winner]?.name || 'Unknown'} wins!
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
        
        {/* Loading/Waiting Screen */}
        {(!room || room.currentPlayers < 2) && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10">
            <div className="bg-white p-6 rounded-lg text-center">
              <div className="text-xl font-bold mb-4">Waiting for opponent...</div>
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <div className="mt-4 text-sm text-gray-600">
                Share your room code with a friend to start fighting!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameArena;