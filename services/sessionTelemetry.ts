import { GameStatus } from '../types';

const TELEMETRY_TIMEOUT_MS = 2500;

export interface SessionTelemetryPayload {
  score: number;
  distance: number;
  level: number;
  status: GameStatus.GAME_OVER | GameStatus.VICTORY;
  difficultyId: 'relaxed' | 'standard' | 'expert';
  endedAt: string;
}

const isFiniteNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

const isPayloadValid = (payload: SessionTelemetryPayload) => {
  return (
    isFiniteNumber(payload.score) &&
    isFiniteNumber(payload.distance) &&
    isFiniteNumber(payload.level) &&
    payload.level >= 1 &&
    payload.score >= 0 &&
    payload.distance >= 0 &&
    (payload.status === GameStatus.GAME_OVER || payload.status === GameStatus.VICTORY)
  );
};

export const sendSessionTelemetry = async (payload: SessionTelemetryPayload) => {
  const endpoint = import.meta.env.VITE_TELEMETRY_ENDPOINT;
  if (!endpoint || typeof fetch === 'undefined') {
    return { sent: false, reason: 'disabled' as const };
  }

  if (!isPayloadValid(payload)) {
    return { sent: false, reason: 'invalid-payload' as const };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: controller.signal,
    });

    return { sent: response.ok as boolean, reason: response.ok ? 'ok' : 'http-error' as const };
  } catch (error) {
    console.error('Telemetry failed:', error);
    return { sent: false, reason: 'network-error' as const };
  } finally {
    clearTimeout(timeout);
  }
};
