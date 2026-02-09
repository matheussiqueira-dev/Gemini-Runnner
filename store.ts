import { create } from 'zustand';
import {
  DIFFICULTY_PRESETS,
  GameStatus,
  MAX_LEVEL,
  RUN_SPEED_BASE,
  ShopItemId,
  TARGET_WORD,
} from './types';
import { sendSessionTelemetry } from './services/sessionTelemetry';

interface GameState {
  status: GameStatus;
  score: number;
  lives: number;
  maxLives: number;
  speed: number;
  collectedLetters: number[];
  level: number;
  laneCount: number;
  gemsCollected: number;
  distance: number;

  currentLane: number;
  jumpSignal: number;

  hasDoubleJump: boolean;
  hasImmortality: boolean;
  isImmortalityActive: boolean;

  difficultyId: 'relaxed' | 'standard' | 'expert';
  bestScore: number;
  sessionsPlayed: number;
  totalDistance: number;

  sessionFinalized: boolean;

  startGame: () => void;
  restartGame: () => void;
  takeDamage: () => void;
  addScore: (amount: number) => void;
  collectGem: (value: number) => void;
  collectLetter: (index: number) => void;
  setStatus: (status: GameStatus) => void;
  setDistance: (distance: number) => void;

  setTargetLane: (lane: number) => void;
  triggerJump: () => void;

  buyItem: (type: ShopItemId, cost: number) => boolean;
  advanceLevel: () => void;
  openShop: () => void;
  closeShop: () => void;
  activateImmortality: () => void;

  setDifficulty: (difficultyId: 'relaxed' | 'standard' | 'expert') => void;
}

const BASE_LIVES = 3;
const BASE_LANES = 3;
const MAX_LANES = 9;
const LETTER_SPEED_STEP = RUN_SPEED_BASE * 0.1;
const LEVEL_SPEED_STEP = RUN_SPEED_BASE * 0.4;
const IMMORTALITY_DURATION_MS = 5000;

let immortalityTimeout: ReturnType<typeof setTimeout> | null = null;

const resolveDifficulty = (difficultyId: GameState['difficultyId']) => {
  return DIFFICULTY_PRESETS.find((preset) => preset.id === difficultyId) ?? DIFFICULTY_PRESETS[1];
};

const buildRunState = (difficultyId: GameState['difficultyId']) => {
  const preset = resolveDifficulty(difficultyId);
  return {
    status: GameStatus.PLAYING,
    score: 0,
    lives: BASE_LIVES,
    maxLives: BASE_LIVES,
    speed: RUN_SPEED_BASE * preset.speedMultiplier,
    collectedLetters: [] as number[],
    level: 1,
    laneCount: BASE_LANES,
    gemsCollected: 0,
    distance: 0,
    currentLane: 0,
    jumpSignal: 0,
    hasDoubleJump: false,
    hasImmortality: false,
    isImmortalityActive: false,
    sessionFinalized: false,
  };
};

const clearImmortalityTimer = () => {
  if (immortalityTimeout) {
    clearTimeout(immortalityTimeout);
    immortalityTimeout = null;
  }
};

const applyTerminalSnapshot = (
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
  status: GameStatus.GAME_OVER | GameStatus.VICTORY,
) => {
  const state = get();
  if (state.sessionFinalized) {
    return;
  }

  set({
    bestScore: Math.max(state.bestScore, state.score),
    sessionsPlayed: state.sessionsPlayed + 1,
    totalDistance: state.totalDistance + Math.max(0, Math.floor(state.distance)),
    sessionFinalized: true,
  });

  void sendSessionTelemetry({
    score: state.score,
    distance: Math.max(0, Math.floor(state.distance)),
    level: state.level,
    status,
    difficultyId: state.difficultyId,
    endedAt: new Date().toISOString(),
  });
};

export const useStore = create<GameState>((set, get) => ({
  status: GameStatus.MENU,
  score: 0,
  lives: BASE_LIVES,
  maxLives: BASE_LIVES,
  speed: 0,
  collectedLetters: [],
  level: 1,
  laneCount: BASE_LANES,
  gemsCollected: 0,
  distance: 0,

  currentLane: 0,
  jumpSignal: 0,

  hasDoubleJump: false,
  hasImmortality: false,
  isImmortalityActive: false,

  difficultyId: 'standard',
  bestScore: 0,
  sessionsPlayed: 0,
  totalDistance: 0,

  sessionFinalized: false,

  startGame: () => {
    clearImmortalityTimer();
    const { difficultyId } = get();
    set(buildRunState(difficultyId));
  },

  restartGame: () => {
    clearImmortalityTimer();
    const { difficultyId } = get();
    set(buildRunState(difficultyId));
  },

  setDifficulty: (difficultyId) => {
    if (get().status !== GameStatus.MENU) {
      return;
    }
    set({ difficultyId });
  },

  setTargetLane: (lane) => {
    const { laneCount, currentLane } = get();
    const maxLane = Math.floor(laneCount / 2);
    const clamped = Math.max(Math.min(lane, maxLane), -maxLane);

    if (clamped !== currentLane) {
      set({ currentLane: clamped });
    }
  },

  triggerJump: () => {
    set({ jumpSignal: Date.now() });
  },

  takeDamage: () => {
    const { lives, isImmortalityActive } = get();
    if (isImmortalityActive) {
      return;
    }

    if (lives > 1) {
      set({ lives: lives - 1 });
      return;
    }

    set({
      lives: 0,
      speed: 0,
      status: GameStatus.GAME_OVER,
    });
    applyTerminalSnapshot(set, get, GameStatus.GAME_OVER);
  },

  addScore: (amount) => {
    const { difficultyId } = get();
    const preset = resolveDifficulty(difficultyId);
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    const scaledAmount = Math.round(safeAmount * preset.scoreMultiplier);

    set((state) => ({
      score: state.score + scaledAmount,
    }));
  },

  collectGem: (value) => {
    const { addScore } = get();
    addScore(value);
    set((state) => ({
      gemsCollected: state.gemsCollected + 1,
    }));
  },

  setDistance: (distance) => {
    const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
    set({ distance: safeDistance });
  },

  collectLetter: (index) => {
    const { collectedLetters, level, speed } = get();

    if (collectedLetters.includes(index)) {
      return;
    }

    const nextLetters = [...collectedLetters, index];

    set({
      collectedLetters: nextLetters,
      speed: speed + LETTER_SPEED_STEP,
    });

    if (nextLetters.length === TARGET_WORD.length) {
      if (level < MAX_LEVEL) {
        get().advanceLevel();
        return;
      }

      set((state) => ({
        status: GameStatus.VICTORY,
        speed: 0,
        score: state.score + 5000,
      }));
      applyTerminalSnapshot(set, get, GameStatus.VICTORY);
    }
  },

  advanceLevel: () => {
    const { level, laneCount, speed } = get();
    const nextLevel = Math.min(level + 1, MAX_LEVEL);

    set({
      level: nextLevel,
      laneCount: Math.min(laneCount + 2, MAX_LANES),
      status: GameStatus.PLAYING,
      speed: speed + LEVEL_SPEED_STEP,
      collectedLetters: [],
      currentLane: 0,
    });
  },

  openShop: () => {
    set({ status: GameStatus.SHOP });
  },

  closeShop: () => {
    set({ status: GameStatus.PLAYING });
  },

  buyItem: (type, cost) => {
    const { score, maxLives, lives } = get();
    if (score < cost) {
      return false;
    }

    set({ score: score - cost });

    switch (type) {
      case 'DOUBLE_JUMP':
        set({ hasDoubleJump: true });
        break;
      case 'MAX_LIFE':
        set({ maxLives: maxLives + 1, lives: lives + 1 });
        break;
      case 'HEAL':
        set({ lives: Math.min(lives + 1, maxLives) });
        break;
      case 'IMMORTAL':
        set({ hasImmortality: true });
        break;
      default:
        return false;
    }

    return true;
  },

  activateImmortality: () => {
    const { hasImmortality, isImmortalityActive } = get();
    if (!hasImmortality || isImmortalityActive) {
      return;
    }

    clearImmortalityTimer();
    set({ isImmortalityActive: true });

    immortalityTimeout = setTimeout(() => {
      set({ isImmortalityActive: false });
      immortalityTimeout = null;
    }, IMMORTALITY_DURATION_MS);
  },

  setStatus: (status) => {
    if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
      clearImmortalityTimer();
      set({ status, speed: 0 });
      applyTerminalSnapshot(set, get, status);
      return;
    }

    set({ status });
  },
}));
