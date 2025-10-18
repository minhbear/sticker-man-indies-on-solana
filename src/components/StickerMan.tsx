'use client';

import React from 'react';
import { Player } from '@/types/game';

interface StickerManProps {
  player: Player;
  scale?: number;
}

export const StickerMan: React.FC<StickerManProps> = ({ player, scale = 1 }) => {
  const { position, health, maxHealth, isAttacking, facingDirection, color, isAlive } = player;
  
  const healthPercentage = (health / maxHealth) * 100;
  
  return (
    <div
      className="absolute transition-all duration-100 ease-out"
      style={{
        left: `${position.x}px`,
        bottom: `${position.y}px`,
        transform: `scale(${scale}) ${facingDirection === 'left' ? 'scaleX(-1)' : ''}`,
        transformOrigin: 'bottom center',
        opacity: isAlive ? 1 : 0.5,
      }}
    >
      {/* Health Bar */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${
            healthPercentage > 60 ? 'bg-green-500' : 
            healthPercentage > 30 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${healthPercentage}%` }}
        />
      </div>
      
      {/* Sticker Man Body */}
      <div className="relative">
        {/* Head */}
        <div 
          className={`w-6 h-6 rounded-full border-2 border-black mx-auto mb-1 ${
            isAttacking ? 'animate-pulse' : ''
          }`}
          style={{ backgroundColor: color }}
        />
        
        {/* Body */}
        <div className="relative">
          {/* Torso */}
          <div className={`w-8 h-10 bg-white border-2 border-black rounded-lg mx-auto relative ${
            !player.isGrounded ? 'animate-bounce' : ''
          }`}>
            {/* Arms */}
            <div 
              className={`absolute -left-3 top-1 w-6 h-2 bg-white border-2 border-black rounded-full transform origin-right transition-transform duration-200 ${
                isAttacking ? 'rotate-45' : 'rotate-12'
              }`}
            />
            <div 
              className={`absolute -right-3 top-1 w-6 h-2 bg-white border-2 border-black rounded-full transform origin-left transition-transform duration-200 ${
                isAttacking ? '-rotate-45' : '-rotate-12'
              }`}
            />
            
            {/* Attack Effect */}
            {isAttacking && (
              <div className="absolute -right-8 top-0 w-6 h-6 text-yellow-400 text-lg font-bold animate-ping">
                ⚡
              </div>
            )}
          </div>
          
          {/* Legs */}
          <div className={`flex justify-center gap-1 mt-1 ${
            !player.isGrounded ? 'animate-pulse' : ''
          }`}>
            <div className="w-2 h-8 bg-white border-2 border-black rounded-full" />
            <div className="w-2 h-8 bg-white border-2 border-black rounded-full" />
          </div>
          
          {/* Feet */}
          <div className="flex justify-center gap-1">
            <div className="w-4 h-2 bg-black rounded-full" />
            <div className="w-4 h-2 bg-black rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Damage Effect */}
      {!isAlive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-2xl animate-bounce">💀</div>
        </div>
      )}
      
      {/* Attack Range Indicator (only during attack) */}
      {isAttacking && (
        <div 
          className="absolute top-0 w-16 h-12 border-2 border-red-500 border-dashed rounded opacity-50"
          style={{
            left: facingDirection === 'right' ? '100%' : '-64px',
          }}
        />
      )}
    </div>
  );
};

export default StickerMan;