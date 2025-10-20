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
    // Start players on ground level using normal canvas coordinates (y=0 is top)
    const isPlayer1 = true; // This should be determined by the actual player order
    playerPosition.current = {
      x: isPlayer1 ? gameConfig.canvasWidth * 0.25 : gameConfig.canvasWidth * 0.75,
      y: gameConfig.canvasHeight - 80 // Ground level (near bottom of canvas)
    };
    isGrounded.current = true; // Make sure player starts grounded
    console.log('🎮 Player position initialized:', playerPosition.current);
  }, [gameConfig, playerId]);

  const updateControls = useCallback(() => {
    // Simple WASD + Arrow key controls for testing
    const wasPressed = keysPressed.current;
    
    controls.current = {
      left: wasPressed.has('KeyA') || wasPressed.has('ArrowLeft'),
      right: wasPressed.has('KeyD') || wasPressed.has('ArrowRight'),
      jump: wasPressed.has('KeyW') || wasPressed.has('ArrowUp'),
      attack: wasPressed.has('Space') || wasPressed.has('Enter') || wasPressed.has('NumpadEnter')
    };
    
    // Manual pickup with F key
    if (wasPressed.has('KeyF')) {
      console.log('🎯 Manual pickup attempt triggered!');
      // This will be handled in the key handler
    }
    
    // Debug only when controls change (reduce spam)
    const hasMovement = controls.current.left || controls.current.right || controls.current.jump || controls.current.attack;
    if (hasMovement && Math.random() < 0.02) { // 2% chance to log when moving
      console.log('🎮 Controls active:', {
        keys: Array.from(wasPressed),
        controls: controls.current,
        position: playerPosition.current
      });
    }
  }, [isGameActive, playerId]);

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
      velocity.y = -jumpForce; // Negative to go up (y=0 is top)
      isGrounded.current = false;
    }

    // Apply gravity when not grounded - normal canvas coordinates
    if (!isGrounded.current) {
      velocity.y += gravity; // Positive gravity pulls down
    }

    // Update position with time-based movement for smoother animation
    const deltaTime = 1; // Assuming 60fps
    position.x += velocity.x * deltaTime;
    position.y += velocity.y * deltaTime;

    // Ground collision - normal canvas coordinates (y=0 is top)
    const groundLevel = canvasHeight - 80; // Ground is near bottom of canvas
    if (position.y >= groundLevel) { // >= because higher Y values are lower on screen
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
    if (!isGameActive) {
      console.log('🚫 Key ignored - game not active:', event.code);
      return;
    }
    
    // Prevent default behavior for ALL game keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter', 'NumpadEnter'].includes(event.code)) {
      event.preventDefault();
      event.stopPropagation();
    }

    keysPressed.current.add(event.code);
    updateControls();
    
    console.log('🎮 Key pressed:', event.code, 'Active keys:', Array.from(keysPressed.current));
  }, [isGameActive, updateControls]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!isGameActive) return;
    
    // Prevent default for game keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter', 'NumpadEnter'].includes(event.code)) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    keysPressed.current.delete(event.code);
    updateControls();
  }, [isGameActive, updateControls]);

  // Set up event listeners
  useEffect(() => {
    console.log('🎮 Setting up keyboard event listeners. isGameActive:', isGameActive);
    
    const handleKeyDownWrapper = (event: KeyboardEvent) => {
      console.log('🎯 Raw keydown event:', event.code, 'isGameActive:', isGameActive);
      handleKeyDown(event);
    };
    
    const handleKeyUpWrapper = (event: KeyboardEvent) => {
      console.log('🎯 Raw keyup event:', event.code, 'isGameActive:', isGameActive);
      handleKeyUp(event);
    };
    
    window.addEventListener('keydown', handleKeyDownWrapper);
    window.addEventListener('keyup', handleKeyUpWrapper);

    return () => {
      console.log('🎮 Removing keyboard event listeners');
      window.removeEventListener('keydown', handleKeyDownWrapper);
      window.removeEventListener('keyup', handleKeyUpWrapper);
    };
  }, [handleKeyDown, handleKeyUp, isGameActive]);

  // Start/stop game loop
  useEffect(() => {
    console.log('🎮 Game loop state change:', { isGameActive, playerId });
    if (isGameActive && playerId) {
      console.log('🚀 Starting game physics loop');
      animationFrameId.current = requestAnimationFrame(updatePhysics);
    } else {
      console.log('⏸️ Stopping game physics loop - isGameActive:', isGameActive, 'playerId:', playerId);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isGameActive, playerId, updatePhysics]);

  // Debug hook state
  useEffect(() => {
    console.log('🎮 useGameControls hook state:', {
      isGameActive,
      playerId,
      hasPosition: !!playerPosition.current,
      position: playerPosition.current,
      keysPressed: Array.from(keysPressed.current),
      controls: controls.current
    });
  }, [isGameActive, playerId]);

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