'use client';

import { useEffect, useCallback, useRef } from 'react';
import { Controls, Position, Velocity, GameConfig } from '@/types/game';

interface UseGameControlsProps {
  onMove: (position: Position, velocity: Velocity, controls: Controls) => void;
  onAttack: () => void;
  gameConfig: GameConfig;
  isGameActive: boolean;
  playerId: string;
}

export const useGameControls = ({
  onMove,
  onAttack,
  gameConfig,
  isGameActive,
  playerId
}: UseGameControlsProps) => {
  const keysPressed = useRef<Set<string>>(new Set());
  const playerPosition = useRef<Position>({ x: 100, y: 0 });
  const playerVelocity = useRef<Velocity>({ x: 0, y: 0 });
  const isGrounded = useRef<boolean>(true);
  const lastAttackTime = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);

  const controls = useRef<Controls>({
    left: false,
    right: false,
    jump: false,
    attack: false
  });

  // Initialize player position based on player ID
  useEffect(() => {
    // Player 1 starts on the left, Player 2 on the right
    const isPlayer1 = true; // This should be determined by the actual player order
    playerPosition.current = {
      x: isPlayer1 ? gameConfig.canvasWidth * 0.25 : gameConfig.canvasWidth * 0.75,
      y: gameConfig.canvasHeight * 0.25 // Start on the platform
    };
    isGrounded.current = true; // Make sure player starts grounded
  }, [gameConfig, playerId]);

  const updateControls = useCallback(() => {
    controls.current = {
      left: keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA'),
      right: keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD'),
      jump: keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW'),
      attack: keysPressed.current.has('Space')
    };
  }, []);

  const updatePhysics = useCallback(() => {
    if (!isGameActive) return;

    const { moveSpeed, gravity, jumpForce, canvasWidth, canvasHeight } = gameConfig;
    const position = playerPosition.current;
    const velocity = playerVelocity.current;
    const currentControls = controls.current;

    // Horizontal movement with better responsiveness
    if (currentControls.left && !currentControls.right) {
      velocity.x = -moveSpeed;
    } else if (currentControls.right && !currentControls.left) {
      velocity.x = moveSpeed;
    } else {
      // Apply friction more gradually for smoother stopping
      velocity.x *= 0.85;
      // Stop very small movements to prevent jitter
      if (Math.abs(velocity.x) < 0.1) {
        velocity.x = 0;
      }
    }

    // Jumping - only allow if grounded
    if (currentControls.jump && isGrounded.current) {
      velocity.y = jumpForce;
      isGrounded.current = false;
    }

    // Apply gravity when not grounded
    if (!isGrounded.current) {
      velocity.y -= gravity; // Note: negative because y=0 is at bottom
    }

    // Update position with time-based movement for smoother animation
    const deltaTime = 1; // Assuming 60fps
    position.x += velocity.x * deltaTime;
    position.y += velocity.y * deltaTime;

    // Ground collision - fix the ground level calculation
    const groundLevel = canvasHeight * 0.25; // This is where the platform is
    if (position.y <= groundLevel) {
      position.y = groundLevel;
      velocity.y = 0;
      isGrounded.current = true;
    } else {
      isGrounded.current = false;
    }

    // Side boundaries with smoother collision
    const playerWidth = gameConfig.playerWidth;
    const leftBound = playerWidth / 2;
    const rightBound = canvasWidth - playerWidth / 2;
    
    if (position.x < leftBound) {
      position.x = leftBound;
      velocity.x = 0;
    } else if (position.x > rightBound) {
      position.x = rightBound;
      velocity.x = 0;
    }

    // Attack handling
    if (currentControls.attack) {
      const now = Date.now();
      if (now - lastAttackTime.current > gameConfig.attackCooldown) {
        lastAttackTime.current = now;
        onAttack();
      }
    }

    // Send movement update at consistent intervals for smoother multiplayer
    onMove(position, velocity, currentControls);

    // Continue animation loop
    if (isGameActive) {
      animationFrameId.current = requestAnimationFrame(updatePhysics);
    }
  }, [isGameActive, gameConfig, onMove, onAttack]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isGameActive) return;
    
    // Prevent default behavior for game keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      event.preventDefault();
    }

    keysPressed.current.add(event.code);
    updateControls();
  }, [isGameActive, updateControls]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!isGameActive) return;
    
    keysPressed.current.delete(event.code);
    updateControls();
  }, [isGameActive, updateControls]);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Start/stop game loop
  useEffect(() => {
    if (isGameActive) {
      animationFrameId.current = requestAnimationFrame(updatePhysics);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isGameActive, updatePhysics]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      keysPressed.current.clear();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return {
    currentPosition: playerPosition.current,
    currentVelocity: playerVelocity.current,
    currentControls: controls.current,
    isGrounded: isGrounded.current
  };
};