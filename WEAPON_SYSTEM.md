# 🗡️ Weapon System Documentation

## Overview
The weapon system allows players to pick up weapons that spawn in the arena and use them to enhance their combat abilities. This system is designed to integrate with the Vorld platform where viewers can purchase weapon packages to drop into the game.

## Features Implemented

### ⚔️ **Weapon Types**
- **Iron Sword** (Common) - +25 damage, 70 range
- **Flame Sword** (Rare) - +35 damage, 75 range 
- **Ice Sword** (Rare) - +30 damage, 70 range
- **Dragon Slayer** (Legendary) - +50 damage, 90 range

### 🎯 **Auto-Spawn System**
- Weapons automatically spawn every **1 minute** after the game starts
- Random weapon selection with 5% chance for legendary weapons
- 5 preset spawn locations across the arena
- "System" dropped weapons for testing

### 🎮 **Gameplay Mechanics**
- **Automatic Pickup**: Walk over weapons to pick them up instantly
- **Auto-Equip**: Weapons are automatically equipped when picked up
- **Enhanced Combat**: Equipped weapons increase attack damage and range
- **Visual Indicators**: Weapons show rarity-based colors and custom icons
- **Tooltips**: Hover over weapons to see stats and rarity

### 🎨 **Visual System**
- **Ground Items**: Animated bouncing weapons with rarity-based colors
  - Gray border: Common weapons
  - Blue border: Rare weapons  
  - Purple border: Epic weapons
  - Yellow border + glow: Legendary weapons
- **Equipped Display**: Weapon icons appear next to players when equipped
- **Attack Effects**: Enhanced attack animations with weapon-specific ranges

## How to Test

1. **Start the Game**: Login with Vorld → Create/Join Room → Start Game
2. **Wait 1 Minute**: A weapon will automatically spawn somewhere on the map
3. **Walk Over Weapon**: Character will automatically pick it up and equip it
4. **Attack**: Notice increased damage and range with the equipped weapon
5. **Multiple Weapons**: Every minute, new weapons spawn for continued gameplay

## Vorld Platform Integration

### 🛒 **For Vorld Platform Configuration**
When setting up weapons in the Vorld platform, use these specifications:

#### **Weapon Package Setup**:
```json
{
  "itemId": "sword_flame",
  "itemName": "Flame Sword", 
  "metadata": {
    "damage": 35,
    "range": 75,
    "rarity": "rare",
    "special": "fire_effect"
  },
  "imageUrl": "https://your-cdn.com/flame-sword.png",
  "price": 100,
  "description": "A burning blade that deals extra fire damage"
}
```

#### **Real-World Integration**:
1. **Viewer Purchase**: Viewer buys weapon package on Vorld platform
2. **Vorld Event**: Platform sends `immediate_item_drop` WebSocket event
3. **Game Response**: Weapon spawns at random location in the arena
4. **Player Interaction**: Players fight to claim the dropped weapon

### 🎪 **Event Flow**:
```
Viewer clicks "Buy Flame Sword" → 
Vorld processes payment → 
WebSocket event sent to game → 
Weapon spawns in arena → 
Players compete to pick it up →
Enhanced combat with new weapon
```

## Code Structure

### **Key Files**:
- `src/config/weapons.ts` - Weapon definitions and spawn logic
- `src/components/GamePage.tsx` - Timer-based weapon spawning  
- `server.js` - Pickup mechanics and combat calculations
- `src/components/StickerMan.tsx` - Visual weapon display on players
- `src/components/DroppedItem.tsx` - Ground weapon rendering

### **Integration Points**:
- **Arena Service**: `src/services/arenaGameService.ts` handles Vorld events
- **Package Drops**: Converts Vorld events to game weapons
- **Socket Events**: Real-time weapon spawn/pickup notifications

## Testing the Fake Implementation

The current implementation includes a "fake" system that spawns weapons every minute for testing. This simulates what would happen when viewers purchase weapons on the Vorld platform.

**Test Flow**:
1. Start a game match
2. After 1 minute, watch for weapons to appear on the map
3. Walk over weapons to pick them up
4. Notice the enhanced combat abilities
5. Continue fighting with upgraded weapons

This provides a complete preview of how the Vorld integration would work in production!

## Future Enhancements

- **Weapon Durability**: Weapons break after certain uses
- **Special Effects**: Fire damage, ice slowing, poison effects
- **Weapon Combining**: Merge weapons for stronger variants
- **Player Trading**: Trade weapons between players
- **Achievement System**: Unlock rare weapons through gameplay