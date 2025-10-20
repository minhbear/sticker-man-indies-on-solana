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
    // Use weapon-specific icon if available
    if (item.weaponInfo?.icon) {
      return item.weaponInfo.icon;
    }
    
    // Use item's custom icon if available
    if (item.icon) {
      return item.icon;
    }
    
    // Fallback to type-based icons
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
    // Use weapon rarity for coloring if available
    if (item.weaponInfo?.rarity) {
      switch (item.weaponInfo.rarity) {
        case 'common':
          return 'border-gray-400 bg-gray-100';
        case 'rare':
          return 'border-blue-400 bg-blue-100';
        case 'epic':
          return 'border-purple-400 bg-purple-100';
        case 'legendary':
          return 'border-yellow-400 bg-yellow-100 shadow-yellow-300 shadow-lg';
      }
    }
    
    // Fallback to type-based colors
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
      title={`${item.name}${item.weaponInfo ? ` (${item.weaponInfo.rarity}, +${item.weaponInfo.damage} damage)` : ''} - dropped by ${item.droppedBy}`}
    >
      <div className="relative">
        {getItemIcon(item.type, item.name)}
        {/* Stronger glow effect for better visibility */}
        <div className="absolute inset-0 rounded-full bg-yellow-300 opacity-50 animate-pulse -z-10" />
        {/* Pickup hint */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-white bg-black bg-opacity-75 px-1 rounded whitespace-nowrap">
          Walk over me!
        </div>
      </div>
    </div>
  );
};

export default DroppedItemComponent;