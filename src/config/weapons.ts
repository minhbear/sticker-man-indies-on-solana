// Weapon Configuration for Sticker Man Fighting Game
import { WeaponInfo } from '@/types/game';

export const WEAPONS: Record<string, WeaponInfo> = {
  'sword_basic': {
    id: 'sword_basic',
    name: 'Iron Sword',
    type: 'sword',
    damage: 25,
    range: 70,
    cooldown: 400,
    rarity: 'common',
    icon: '⚔️',
    description: 'A reliable iron sword for close combat'
  },
  'sword_flame': {
    id: 'sword_flame',
    name: 'Flame Sword',
    type: 'sword',
    damage: 35,
    range: 75,
    cooldown: 450,
    rarity: 'rare',
    icon: '🔥⚔️',
    description: 'A burning blade that deals extra damage'
  },
  'sword_ice': {
    id: 'sword_ice',
    name: 'Ice Sword',
    type: 'sword',
    damage: 30,
    range: 70,
    cooldown: 400,
    rarity: 'rare',
    icon: '❄️⚔️',
    description: 'A frozen blade that slows enemies'
  },
  'sword_legendary': {
    id: 'sword_legendary',
    name: 'Dragon Slayer',
    type: 'sword',
    damage: 50,
    range: 90,
    cooldown: 300,
    rarity: 'legendary',
    icon: '🐉⚔️',
    description: 'A legendary sword forged to slay dragons'
  }
};

export const WEAPON_SPAWN_CONFIG = {
  // Timer for automatic weapon spawns
  AUTO_SPAWN_INTERVAL: 60000, // 1 minute in milliseconds
  SPAWN_VARIANTS: ['sword_basic', 'sword_flame', 'sword_ice'], // Available for auto-spawn
  LEGENDARY_SPAWN_CHANCE: 0.05, // 5% chance for legendary weapons
  
  // Spawn locations (safe positions on the map) - using normal canvas coordinates (y=0 is top)
  SPAWN_POSITIONS: [
    { x: 150, y: 520 },  // Left side ground level
    { x: 400, y: 520 },  // Center ground level  
    { x: 650, y: 520 },  // Right side ground level
    { x: 300, y: 520 },  // Lower left ground
    { x: 500, y: 520 },  // Lower right ground
  ]
};

// Helper functions for weapon management
export class WeaponManager {
  static getRandomWeapon(): WeaponInfo {
    const spawnVariants = WEAPON_SPAWN_CONFIG.SPAWN_VARIANTS;
    const isLegendary = Math.random() < WEAPON_SPAWN_CONFIG.LEGENDARY_SPAWN_CHANCE;
    
    if (isLegendary) {
      return WEAPONS['sword_legendary'];
    }
    
    const randomIndex = Math.floor(Math.random() * spawnVariants.length);
    const weaponId = spawnVariants[randomIndex];
    return WEAPONS[weaponId];
  }

  static getRandomSpawnPosition() {
    const positions = WEAPON_SPAWN_CONFIG.SPAWN_POSITIONS;
    const randomIndex = Math.floor(Math.random() * positions.length);
    return positions[randomIndex];
  }

  static createDroppedWeapon(weaponInfo: WeaponInfo, position?: { x: number; y: number }) {
    const spawnPosition = position || this.getRandomSpawnPosition();
    
    return {
      id: `weapon_${weaponInfo.id}_${Date.now()}`,
      type: 'weapon' as const,
      name: weaponInfo.name,
      position: spawnPosition,
      properties: {
        attack: weaponInfo.damage,
        defense: 0,
        heal: 0,
        speedBoost: 0
      },
      icon: weaponInfo.icon,
      droppedBy: 'system',
      droppedAt: Date.now(),
      weaponInfo: weaponInfo
    };
  }
}