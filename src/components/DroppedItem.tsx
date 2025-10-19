'use client';

import React from 'react';
import { DroppedItem } from '@/types/game';

interface DroppedItemComponentProps {
  item: DroppedItem;
  onPickup: (itemId: string) => void;
}

export const DroppedItemComponent: React.FC<DroppedItemComponentProps> = ({ 
  item, 
  onPickup 
}) => {
  const getItemIcon = (type: string, name: string) => {
    switch (type) {
      case 'weapon':
        if (name.toLowerCase().includes('sword')) return '⚔️';
        if (name.toLowerCase().includes('axe')) return '🪓';
        if (name.toLowerCase().includes('bow')) return '🏹';
        return '🗡️';
      case 'shield':
        return '🛡️';
      case 'consumable':
        if (name.toLowerCase().includes('health')) return '❤️';
        if (name.toLowerCase().includes('speed')) return '💨';
        return '🧪';
      default:
        return '📦';
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'weapon':
        return 'border-red-400 bg-red-100';
      case 'shield':
        return 'border-blue-400 bg-blue-100';
      case 'consumable':
        return 'border-green-400 bg-green-100';
      default:
        return 'border-gray-400 bg-gray-100';
    }
  };

  return (
    <div
      className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 
        w-12 h-12 ${getItemColor(item.type)} border-2 rounded-lg 
        flex items-center justify-center text-2xl
        hover:scale-110 transition-all duration-200 
        animate-bounce shadow-lg`}
      style={{
        left: `${item.position.x}px`,
        top: `${item.position.y}px`,
        zIndex: 5
      }}
      onClick={() => onPickup(item.id)}
      title={`${item.name} (dropped by ${item.droppedBy})`}
    >
      <div className="relative">
        {getItemIcon(item.type, item.name)}
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-yellow-300 opacity-30 animate-pulse -z-10" />
      </div>
    </div>
  );
};

export default DroppedItemComponent;