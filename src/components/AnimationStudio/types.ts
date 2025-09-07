export type ActionType = 
  | 'jump' 
  | 'fall' 
  | 'land' 
  | 'idle' 
  | 'flip' 
  | 'spin' 
  | 'bounce' 
  | 'float'
  | 'attack'
  | 'dodge'
  | 'hit'
  | 'roll';

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';

export interface ActionBlockDefinition {
  id: string;
  type: ActionType;
  name: string;
  description: string;
  icon: string;
  defaultDuration: number;
  defaultParameters: ActionParameters;
  category: 'movement' | 'combat' | 'special';
}

export interface ActionParameters {
  height?: number;
  distance?: number;
  rotation?: number;
  intensity?: number;
  easing?: EasingType;
  bounceCount?: number;
  speed?: number;
}

export interface ActionBlockInstance {
  id: string;
  definitionId: string;
  type: ActionType;
  name: string;
  duration: number;
  parameters: ActionParameters;
  startTime?: number;
  spriteFrames?: string[];
}

export interface AnimationSequence {
  id: string;
  name: string;
  blocks: ActionBlockInstance[];
  totalDuration: number;
  loop: boolean;
}

export interface CharacterLayer {
  id: string;
  name: string;
  sprites: SpriteFrame[];
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
  sequence: AnimationSequence;
}

export interface SpriteFrame {
  id: string;
  name: string;
  src: string;
}

export interface AnimationState {
  currentBlockIndex: number;
  blockStartTime: number;
  currentTime: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  isPlaying: boolean;
}