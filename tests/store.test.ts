import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';
import { GameStatus, MAX_LEVEL, RUN_SPEED_BASE, TARGET_WORD } from '../types';

const resetStoreState = () => {
  useStore.setState({
    status: GameStatus.MENU,
    score: 0,
    lives: 3,
    maxLives: 3,
    speed: 0,
    collectedLetters: [],
    level: 1,
    laneCount: 3,
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
  });
};

describe('game store', () => {
  beforeEach(() => {
    resetStoreState();
  });

  it('applies difficulty multipliers when starting a run', () => {
    useStore.getState().setDifficulty('expert');
    useStore.getState().startGame();

    const state = useStore.getState();
    expect(state.status).toBe(GameStatus.PLAYING);
    expect(state.speed).toBeCloseTo(RUN_SPEED_BASE * 1.18, 6);
  });

  it('advances level when all target letters are collected', () => {
    useStore.getState().startGame();

    TARGET_WORD.forEach((_, index) => {
      useStore.getState().collectLetter(index);
    });

    const state = useStore.getState();
    expect(state.level).toBe(2);
    expect(state.collectedLetters).toHaveLength(0);
    expect(state.status).toBe(GameStatus.PLAYING);
  });

  it('triggers victory and session finalization at max level', () => {
    useStore.getState().startGame();
    useStore.setState({ level: MAX_LEVEL });

    TARGET_WORD.forEach((_, index) => {
      useStore.getState().collectLetter(index);
    });

    const state = useStore.getState();
    expect(state.status).toBe(GameStatus.VICTORY);
    expect(state.score).toBe(5000);
    expect(state.sessionFinalized).toBe(true);
    expect(state.sessionsPlayed).toBe(1);
  });

  it('enters game over and updates aggregates when last life is lost', () => {
    useStore.getState().startGame();
    useStore.setState({ score: 1234, lives: 1, distance: 98.8 });

    useStore.getState().takeDamage();

    const state = useStore.getState();
    expect(state.status).toBe(GameStatus.GAME_OVER);
    expect(state.speed).toBe(0);
    expect(state.bestScore).toBe(1234);
    expect(state.totalDistance).toBe(98);
    expect(state.sessionsPlayed).toBe(1);
  });

  it('handles shop purchases with validation', () => {
    useStore.getState().startGame();
    useStore.setState({ score: 2500 });

    const boughtLife = useStore.getState().buyItem('MAX_LIFE', 1500);
    const deniedPurchase = useStore.getState().buyItem('IMMORTAL', 9999);

    const state = useStore.getState();
    expect(boughtLife).toBe(true);
    expect(deniedPurchase).toBe(false);
    expect(state.maxLives).toBe(4);
    expect(state.score).toBe(1000);
  });
});
