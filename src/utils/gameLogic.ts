import { Player, Position, AttackHitbox, GameConfig } from '@/types/game';

export class GameLogic {
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  // Check if two rectangles collide
  private checkCollision(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  // Calculate distance between two points
  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Generate attack hitbox based on player position and facing direction
  private getAttackHitbox(player: Player): AttackHitbox {
    const hitboxWidth = this.config.attackRange;
    const hitboxHeight = this.config.playerHeight;
    
    let hitboxX: number;
    if (player.facingDirection === 'right') {
      hitboxX = player.position.x + this.config.playerWidth / 2;
    } else {
      hitboxX = player.position.x - hitboxWidth - this.config.playerWidth / 2;
    }
    
    return {
      x: hitboxX,
      y: player.position.y,
      width: hitboxWidth,
      height: hitboxHeight
    };
  }

  // Check if an attack hits a target
  checkAttackHit(attacker: Player, target: Player): boolean {
    if (!attacker.isAttacking || !target.isAlive) {
      return false;
    }

    const attackHitbox = this.getAttackHitbox(attacker);
    const targetHitbox = {
      x: target.position.x - this.config.playerWidth / 2,
      y: target.position.y,
      width: this.config.playerWidth,
      height: this.config.playerHeight
    };

    return this.checkCollision(attackHitbox, targetHitbox);
  }

  // Apply damage to a player
  applyDamage(player: Player, damage: number): Player {
    const newHealth = Math.max(0, player.health - damage);
    return {
      ...player,
      health: newHealth,
      isAlive: newHealth > 0
    };
  }

  // Check if a player can attack (cooldown management)
  canPlayerAttack(player: Player, currentTime: number): boolean {
    return (
      player.isAlive &&
      currentTime - player.lastAttackTime >= this.config.attackCooldown
    );
  }

  // Update player attack state
  updatePlayerAttack(player: Player, isAttacking: boolean, currentTime: number): Player {
    return {
      ...player,
      isAttacking,
      lastAttackTime: isAttacking ? currentTime : player.lastAttackTime,
      attackCooldown: isAttacking ? this.config.attackCooldown : Math.max(0, player.attackCooldown - 16) // Assume 60fps
    };
  }

  // Check if player is within arena bounds
  isPlayerInBounds(player: Player): boolean {
    const { position } = player;
    const { canvasWidth, canvasHeight } = this.config;
    
    return (
      position.x >= 0 &&
      position.x <= canvasWidth &&
      position.y >= 0 &&
      position.y <= canvasHeight
    );
  }

  // Constrain player to arena bounds
  constrainPlayerToBounds(player: Player): Player {
    const { position } = player;
    const { canvasWidth, canvasHeight, playerWidth } = this.config;
    
    const constrainedPosition = {
      x: Math.max(playerWidth / 2, Math.min(canvasWidth - playerWidth / 2, position.x)),
      y: Math.max(0, Math.min(canvasHeight, position.y))
    };

    return {
      ...player,
      position: constrainedPosition
    };
  }

  // Update player facing direction based on movement
  updateFacingDirection(player: Player, targetPosition?: Position): Player {
    if (targetPosition) {
      // Face towards target
      const facingDirection = player.position.x < targetPosition.x ? 'right' : 'left';
      return { ...player, facingDirection };
    }
    
    // Face based on velocity
    if (player.velocity.x > 0) {
      return { ...player, facingDirection: 'right' };
    } else if (player.velocity.x < 0) {
      return { ...player, facingDirection: 'left' };
    }
    
    return player;
  }

  // Check for game end condition
  checkGameEnd(players: { [playerId: string]: Player }): string | null {
    const alivePlayers = Object.values(players).filter(player => player.isAlive);
    
    if (alivePlayers.length <= 1) {
      return alivePlayers.length === 1 ? alivePlayers[0].id : 'draw';
    }
    
    return null;
  }

  // Calculate knockback effect from attack
  calculateKnockback(attacker: Player, target: Player, knockbackForce: number = 5): Position {
    const direction = attacker.position.x < target.position.x ? 1 : -1;
    const knockbackX = direction * knockbackForce;
    const knockbackY = 2; // Small upward knockback
    
    return {
      x: target.position.x + knockbackX,
      y: target.position.y + knockbackY
    };
  }

  // Apply physics to player (gravity, ground collision, etc.)
  applyPhysics(player: Player, deltaTime: number): Player {
    const { gravity, canvasHeight } = this.config;
    const groundLevel = canvasHeight * 0.25;
    
    let newVelocity = { ...player.velocity };
    let newPosition = { ...player.position };
    let isGrounded = player.isGrounded;

    // Apply gravity if not grounded
    if (!isGrounded) {
      newVelocity.y += gravity * deltaTime;
    }

    // Update position based on velocity
    newPosition.x += newVelocity.x * deltaTime;
    newPosition.y += newVelocity.y * deltaTime;

    // Ground collision
    if (newPosition.y <= groundLevel) {
      newPosition.y = groundLevel;
      newVelocity.y = 0;
      isGrounded = true;
    } else {
      isGrounded = false;
    }

    // Apply friction when grounded
    if (isGrounded) {
      newVelocity.x *= 0.8;
    }

    return {
      ...player,
      position: newPosition,
      velocity: newVelocity,
      isGrounded
    };
  }

  // Generate random spawn position for player
  generateSpawnPosition(playerIndex: number): Position {
    const { canvasWidth, canvasHeight } = this.config;
    const groundLevel = canvasHeight * 0.25;
    
    // Player 1 spawns on the left, Player 2 on the right
    const x = playerIndex === 0 ? canvasWidth * 0.2 : canvasWidth * 0.8;
    
    return {
      x,
      y: groundLevel
    };
  }

  // Check if two players are overlapping and resolve collision
  resolvePlayerCollision(player1: Player, player2: Player): { player1: Player; player2: Player } {
    const distance = this.calculateDistance(player1.position, player2.position);
    const minDistance = this.config.playerWidth;
    
    if (distance < minDistance && distance > 0) {
      // Calculate overlap
      const overlap = minDistance - distance;
      const separationX = ((player1.position.x - player2.position.x) / distance) * (overlap / 2);
      
      // Move players apart
      const newPlayer1Position = {
        x: player1.position.x + separationX,
        y: player1.position.y
      };
      
      const newPlayer2Position = {
        x: player2.position.x - separationX,
        y: player2.position.y
      };
      
      return {
        player1: { ...player1, position: newPlayer1Position },
        player2: { ...player2, position: newPlayer2Position }
      };
    }
    
    return { player1, player2 };
  }
}