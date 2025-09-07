import type { ActionBlockDefinition } from './types';

export const ACTION_BLOCKS: ActionBlockDefinition[] = [
  // Movement blocks
  {
    id: 'jump-basic',
    type: 'jump',
    name: 'Jump',
    description: 'Basic upward jump',
    icon: '⬆️',
    defaultDuration: 500,
    defaultParameters: {
      height: 100,
      distance: 0,
      easing: 'easeOut'
    },
    category: 'movement'
  },
  {
    id: 'fall-basic',
    type: 'fall',
    name: 'Fall',
    description: 'Gravity fall',
    icon: '⬇️',
    defaultDuration: 400,
    defaultParameters: {
      height: 100,
      rotation: 0,
      easing: 'easeIn'
    },
    category: 'movement'
  },
  {
    id: 'land-basic',
    type: 'land',
    name: 'Land',
    description: 'Landing with squash',
    icon: '🦶',
    defaultDuration: 200,
    defaultParameters: {
      intensity: 1,
      easing: 'easeOut'
    },
    category: 'movement'
  },
  {
    id: 'idle-basic',
    type: 'idle',
    name: 'Idle',
    description: 'Breathing idle',
    icon: '😌',
    defaultDuration: 1000,
    defaultParameters: {
      easing: 'linear'
    },
    category: 'movement'
  },

  // Special blocks
  {
    id: 'flip-basic',
    type: 'flip',
    name: 'Flip',
    description: '360° flip',
    icon: '🤸',
    defaultDuration: 600,
    defaultParameters: {
      height: 50,
      rotation: 360,
      easing: 'easeInOut'
    },
    category: 'special'
  },
  {
    id: 'spin-basic',
    type: 'spin',
    name: 'Spin',
    description: 'Continuous spin',
    icon: '🌀',
    defaultDuration: 500,
    defaultParameters: {
      rotation: 360,
      easing: 'linear'
    },
    category: 'special'
  },
  {
    id: 'bounce-basic',
    type: 'bounce',
    name: 'Bounce',
    description: 'Rex-style bounce',
    icon: '⚡',
    defaultDuration: 1000,
    defaultParameters: {
      height: 50,
      distance: 100,
      bounceCount: 3,
      easing: 'linear'
    },
    category: 'special'
  },
  {
    id: 'float-basic',
    type: 'float',
    name: 'Float',
    description: 'Floating motion',
    icon: '🎈',
    defaultDuration: 2000,
    defaultParameters: {
      height: 30,
      distance: 0,
      easing: 'easeInOut'
    },
    category: 'special'
  },
  {
    id: 'roll-basic',
    type: 'roll',
    name: 'Roll',
    description: 'Forward roll',
    icon: '🎱',
    defaultDuration: 800,
    defaultParameters: {
      distance: 200,
      speed: 1,
      easing: 'linear'
    },
    category: 'special'
  },

  // Combat blocks
  {
    id: 'attack-basic',
    type: 'attack',
    name: 'Attack',
    description: 'Strike forward',
    icon: '⚔️',
    defaultDuration: 300,
    defaultParameters: {
      distance: 50,
      intensity: 1,
      easing: 'easeOut'
    },
    category: 'combat'
  },
  {
    id: 'dodge-basic',
    type: 'dodge',
    name: 'Dodge',
    description: 'Quick sidestep',
    icon: '💨',
    defaultDuration: 400,
    defaultParameters: {
      distance: 100,
      easing: 'easeInOut'
    },
    category: 'combat'
  },
  {
    id: 'hit-basic',
    type: 'hit',
    name: 'Hit',
    description: 'Take damage',
    icon: '💥',
    defaultDuration: 300,
    defaultParameters: {
      intensity: 10,
      easing: 'easeOut'
    },
    category: 'combat'
  }
];

// Smart Templates
export const SMART_TEMPLATES = [
  {
    id: 'rex-full-jump',
    name: 'Rex Full Jump',
    description: 'Complete Rex jump sequence',
    blocks: ['idle-basic', 'jump-basic', 'flip-basic', 'fall-basic', 'land-basic', 'idle-basic']
  },
  {
    id: 'cat-stalker',
    name: 'Cat Stalker',
    description: 'Cat stalking sequence',
    blocks: ['idle-basic', 'idle-basic', 'dodge-basic', 'attack-basic', 'land-basic']
  },
  {
    id: 'beetle-attack',
    name: 'Beetle Attack',
    description: 'Beetle rolling attack',
    blocks: ['roll-basic', 'attack-basic', 'bounce-basic']
  },
  {
    id: 'boss-entry',
    name: 'Boss Entry',
    description: 'Dramatic boss entrance',
    blocks: ['fall-basic', 'land-basic', 'idle-basic', 'spin-basic']
  }
];