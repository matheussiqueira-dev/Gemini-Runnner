import type { LucideIcon } from 'lucide-react';

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
}

export enum ObjectType {
  OBSTACLE = 'OBSTACLE',
  GEM = 'GEM',
  LETTER = 'LETTER',
  SHOP_PORTAL = 'SHOP_PORTAL',
  ALIEN = 'ALIEN',
  MISSILE = 'MISSILE',
}

export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number];
  active: boolean;
  value?: string;
  color?: string;
  targetIndex?: number;
  points?: number;
  hasFired?: boolean;
}

export const LANE_WIDTH = 2.2;
export const JUMP_HEIGHT = 2.5;
export const JUMP_DURATION = 0.6;
export const RUN_SPEED_BASE = 22.5;
export const SPAWN_DISTANCE = 120;
export const REMOVE_DISTANCE = 20;
export const MAX_LEVEL = 3;

export const TARGET_WORD = ['A', 'U', 'R', 'O', 'R', 'A'] as const;

export const TARGET_COLORS = [
  '#00f5d4',
  '#6de7ff',
  '#7b9dff',
  '#ffd166',
  '#ff8f70',
  '#ff4ecd',
] as const;

export type ShopItemId = 'DOUBLE_JUMP' | 'MAX_LIFE' | 'HEAL' | 'IMMORTAL';

export interface ShopItem {
  id: ShopItemId;
  name: string;
  description: string;
  cost: number;
  icon: LucideIcon;
  oneTime?: boolean;
}

export interface DifficultyPreset {
  id: 'relaxed' | 'standard' | 'expert';
  label: string;
  description: string;
  speedMultiplier: number;
  scoreMultiplier: number;
}

export const DIFFICULTY_PRESETS: DifficultyPreset[] = [
  {
    id: 'relaxed',
    label: 'RELAXED',
    description: 'Mais tempo de reacao e progressao suave.',
    speedMultiplier: 0.88,
    scoreMultiplier: 0.85,
  },
  {
    id: 'standard',
    label: 'STANDARD',
    description: 'Balanceado para a experiencia principal.',
    speedMultiplier: 1,
    scoreMultiplier: 1,
  },
  {
    id: 'expert',
    label: 'EXPERT',
    description: 'Alta velocidade e maior recompensa.',
    speedMultiplier: 1.18,
    scoreMultiplier: 1.25,
  },
];
