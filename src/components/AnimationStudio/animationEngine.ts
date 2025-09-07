import { ActionBlockInstance, EasingType } from './types';

interface AnimationFrame {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  color?: string;
  effects?: Array<{
    type: string;
    opacity?: number;
    color?: string;
    positions?: Array<{ x: number; y: number }>;
  }>;
}

// Easing functions
const easingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  }
};

export function calculateAnimation(
  blocks: ActionBlockInstance[],
  currentTime: number
): AnimationFrame {
  const frame: AnimationFrame = {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    effects: []
  };

  if (blocks.length === 0) return frame;

  let accumulatedTime = 0;
  let currentBlockIndex = -1;
  let blockProgress = 0;

  // Find current block and progress
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (currentTime >= accumulatedTime && currentTime < accumulatedTime + block.duration) {
      currentBlockIndex = i;
      blockProgress = (currentTime - accumulatedTime) / block.duration;
      break;
    }
    accumulatedTime += block.duration;
  }

  if (currentBlockIndex === -1) {
    // Animation complete, return final position
    return frame;
  }

  const block = blocks[currentBlockIndex];
  const easing = easingFunctions[block.parameters.easing || 'linear'];
  const easedProgress = easing(blockProgress);

  // Calculate animation based on block type
  switch (block.type) {
    case 'jump':
      frame.y = -(block.parameters.height || 100) * Math.sin(easedProgress * Math.PI);
      frame.x = (block.parameters.distance || 0) * easedProgress;
      break;

    case 'fall':
      frame.y = (block.parameters.height || 100) * easedProgress;
      frame.rotation = (block.parameters.rotation || 0) * easedProgress;
      break;

    case 'land':
      frame.scaleX = 1 + 0.2 * Math.sin(easedProgress * Math.PI);
      frame.scaleY = 1 - 0.2 * Math.sin(easedProgress * Math.PI);
      break;

    case 'flip':
      frame.rotation = 360 * easedProgress;
      frame.y = -(block.parameters.height || 50) * Math.sin(easedProgress * Math.PI);
      break;

    case 'spin':
      frame.rotation = (block.parameters.rotation || 360) * easedProgress;
      break;

    case 'bounce':
      const bounceCount = block.parameters.bounceCount || 3;
      const bouncePhase = (easedProgress * bounceCount) % 1;
      frame.y = -(block.parameters.height || 50) * Math.abs(Math.sin(bouncePhase * Math.PI));
      frame.x = (block.parameters.distance || 100) * easedProgress;
      break;

    case 'float':
      frame.y = -(block.parameters.height || 30) + 
                10 * Math.sin(easedProgress * Math.PI * 4);
      frame.x = (block.parameters.distance || 0) * easedProgress;
      frame.opacity = 0.7 + 0.3 * Math.sin(easedProgress * Math.PI * 2);
      break;

    case 'roll':
      frame.rotation = 360 * easedProgress * (block.parameters.speed || 1);
      frame.x = (block.parameters.distance || 200) * easedProgress;
      break;

    case 'attack':
      frame.x = (block.parameters.distance || 50) * Math.sin(easedProgress * Math.PI);
      frame.scaleX = 1 + 0.3 * Math.sin(easedProgress * Math.PI);
      frame.color = easedProgress > 0.5 ? '#EF4444' : '#4F46E5';
      break;

    case 'dodge':
      frame.x = -(block.parameters.distance || 100) * Math.sin(easedProgress * Math.PI);
      frame.rotation = -20 * Math.sin(easedProgress * Math.PI);
      
      // Add motion blur effect
      frame.effects?.push({
        type: 'trail',
        opacity: 0.3,
        positions: Array.from({ length: 3 }, (_, i) => ({
          x: frame.x * (1 - (i + 1) * 0.2),
          y: 0
        }))
      });
      break;

    case 'hit':
      const shakeIntensity = (block.parameters.intensity || 10) * (1 - easedProgress);
      frame.x = (Math.random() - 0.5) * shakeIntensity;
      frame.y = (Math.random() - 0.5) * shakeIntensity;
      frame.color = '#EF4444';
      frame.opacity = 0.7 + 0.3 * Math.random();
      break;

    case 'idle':
      // Subtle breathing animation
      frame.scaleY = 1 + 0.02 * Math.sin(easedProgress * Math.PI * 2);
      frame.y = 2 * Math.sin(easedProgress * Math.PI * 2);
      break;
  }

  // Accumulate position from previous blocks
  for (let i = 0; i < currentBlockIndex; i++) {
    const prevBlock = blocks[i];
    const prevEasing = easingFunctions[prevBlock.parameters.easing || 'linear'];
    const finalProgress = prevEasing(1);

    switch (prevBlock.type) {
      case 'jump':
      case 'bounce':
      case 'float':
      case 'roll':
        frame.x += (prevBlock.parameters.distance || 0);
        break;
    }
  }

  return frame;
}