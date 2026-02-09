import React, { useMemo } from 'react';
import {
  Activity,
  ArrowUpCircle,
  Diamond,
  Heart,
  Play,
  PlusCircle,
  Rocket,
  Shield,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { audio } from '../System/Audio';
import { useStore } from '../../store';
import {
  DIFFICULTY_PRESETS,
  GameStatus,
  MAX_LEVEL,
  RUN_SPEED_BASE,
  ShopItem,
  TARGET_COLORS,
  TARGET_WORD,
} from '../../types';

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'DOUBLE_JUMP',
    name: 'DOUBLE JUMP',
    description: 'Permite um segundo salto no ar para ultrapassar obstaculos altos.',
    cost: 1000,
    icon: ArrowUpCircle,
    oneTime: true,
  },
  {
    id: 'MAX_LIFE',
    name: 'LIFE BOOST',
    description: 'Aumenta permanentemente o limite de vida e cura instantaneamente.',
    cost: 1500,
    icon: Activity,
  },
  {
    id: 'HEAL',
    name: 'REPAIR KIT',
    description: 'Recupera 1 ponto de vida sem interromper a partida.',
    cost: 1000,
    icon: PlusCircle,
  },
  {
    id: 'IMMORTAL',
    name: 'PHASE SHIELD',
    description: 'Habilita invulnerabilidade por 5s ao usar Espaco ou toque.',
    cost: 3000,
    icon: Shield,
    oneTime: true,
  },
];

const formatDistance = (distance: number) => `${Math.floor(distance).toLocaleString()} m`;

const useShopItems = () => {
  const { hasDoubleJump, hasImmortality } = useStore();

  return useMemo(() => {
    const filtered = SHOP_ITEMS.filter((item) => {
      if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
      if (item.id === 'IMMORTAL' && hasImmortality) return false;
      return true;
    });

    return [...filtered].sort(() => Math.random() - 0.5).slice(0, 3);
  }, [hasDoubleJump, hasImmortality]);
};

const ShopScreen: React.FC = () => {
  const { score, buyItem, closeShop } = useStore();
  const items = useShopItems();

  return (
    <section className="overlay-layer" aria-label="Loja de melhorias">
      <div className="panel glass panel-large">
        <header className="panel-header">
          <h2>Tech Depot</h2>
          <p>Creditos disponiveis: {score.toLocaleString()}</p>
        </header>

        <div className="shop-grid">
          {items.map((item) => {
            const Icon = item.icon;
            const canAfford = score >= item.cost;

            return (
              <article className="shop-card" key={item.id}>
                <div className="shop-card-icon" aria-hidden="true">
                  <Icon size={24} />
                </div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <button
                  type="button"
                  onClick={() => buyItem(item.id, item.cost)}
                  className="btn btn-secondary"
                  disabled={!canAfford}
                >
                  {item.cost.toLocaleString()} pontos
                </button>
              </article>
            );
          })}
        </div>

        <button type="button" onClick={closeShop} className="btn btn-primary panel-cta">
          <Play size={18} /> Continuar corrida
        </button>
      </div>
    </section>
  );
};

const MenuScreen: React.FC = () => {
  const { startGame, setDifficulty, difficultyId, bestScore, sessionsPlayed } = useStore();

  return (
    <section className="overlay-layer" aria-label="Menu principal">
      <div className="panel hero-panel">
        <header>
          <p className="eyebrow">Neon Orbit Runner</p>
          <h1>Corrida sintetica com controle por movimento</h1>
          <p className="hero-copy">
            Desvie de obstaculos, capture fragmentos de energia e complete a sequencia para subir de nivel.
          </p>
        </header>

        <div className="difficulty-row" role="group" aria-label="Selecionar dificuldade">
          {DIFFICULTY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDifficulty(preset.id)}
              className={`difficulty-pill ${difficultyId === preset.id ? 'is-active' : ''}`}
              aria-pressed={difficultyId === preset.id}
            >
              <span>{preset.label}</span>
              <small>{preset.description}</small>
            </button>
          ))}
        </div>

        <div className="menu-kpis">
          <article>
            <Trophy size={18} />
            <div>
              <strong>{bestScore.toLocaleString()}</strong>
              <span>Melhor score</span>
            </div>
          </article>
          <article>
            <Rocket size={18} />
            <div>
              <strong>{sessionsPlayed.toLocaleString()}</strong>
              <span>Sessoes concluidas</span>
            </div>
          </article>
        </div>

        <div className="control-chip-row" aria-label="Controles">
          <span>Setas ou swipe para mover</span>
          <span>Seta para cima para pular</span>
          <span>Espaco ou toque para escudo</span>
        </div>

        <button
          type="button"
          className="btn btn-primary panel-cta"
          onClick={() => {
            audio.init();
            startGame();
          }}
        >
          <Play size={18} /> Iniciar corrida
        </button>
      </div>
    </section>
  );
};

const EndScreen: React.FC<{ mode: 'loss' | 'win' }> = ({ mode }) => {
  const { score, level, gemsCollected, distance, restartGame } = useStore();
  const isWin = mode === 'win';

  return (
    <section className="overlay-layer" aria-label={isWin ? 'Tela de vitoria' : 'Tela de derrota'}>
      <div className="panel glass panel-large">
        <header className="panel-header">
          <p className="eyebrow">{isWin ? 'Missao concluida' : 'Fim de rodada'}</p>
          <h2>{isWin ? 'Trajeto dominado' : 'Impacto detectado'}</h2>
          <p>
            {isWin
              ? 'Voce completou todos os niveis e maximizou a trilha orbital.'
              : 'Reconfigure sua estrategia e tente uma nova rota.'}
          </p>
        </header>

        <div className="summary-grid">
          <article>
            <Trophy size={18} />
            <strong>{level} / {MAX_LEVEL}</strong>
            <span>Nivel final</span>
          </article>
          <article>
            <Diamond size={18} />
            <strong>{gemsCollected.toLocaleString()}</strong>
            <span>Fragmentos coletados</span>
          </article>
          <article>
            <Zap size={18} />
            <strong>{formatDistance(distance)}</strong>
            <span>Distancia percorrida</span>
          </article>
        </div>

        <div className="score-banner" role="status">
          <span>Score total</span>
          <strong>{score.toLocaleString()}</strong>
        </div>

        <button
          type="button"
          className="btn btn-primary panel-cta"
          onClick={() => {
            audio.init();
            restartGame();
          }}
        >
          <Play size={18} /> Nova tentativa
        </button>
      </div>
    </section>
  );
};

const LiveHud: React.FC = () => {
  const {
    score,
    lives,
    maxLives,
    collectedLetters,
    level,
    speed,
    gemsCollected,
    distance,
    isImmortalityActive,
  } = useStore();

  return (
    <div className="hud-root" aria-live="polite">
      <header className="hud-topbar">
        <div className="score-stack">
          <span>Score</span>
          <strong>{score.toLocaleString()}</strong>
        </div>

        <div className="hud-center-pill">Nivel {level} / {MAX_LEVEL}</div>

        <div className="lives-row" aria-label={`Vidas: ${lives} de ${maxLives}`}>
          {Array.from({ length: maxLives }).map((_, index) => (
            <Heart
              key={`life-${index}`}
              size={22}
              className={index < lives ? 'life-active' : 'life-empty'}
              fill={index < lives ? 'currentColor' : 'none'}
            />
          ))}
        </div>
      </header>

      <section className="objective-strip" aria-label="Progresso da sequencia">
        {TARGET_WORD.map((character, index) => {
          const isCollected = collectedLetters.includes(index);
          const color = TARGET_COLORS[index];

          return (
            <div
              key={`${character}-${index}`}
              className={`objective-cell ${isCollected ? 'is-collected' : ''}`}
              style={{
                '--cell-color': color,
              } as React.CSSProperties}
            >
              {character}
            </div>
          );
        })}
      </section>

      <aside className="hud-metrics" aria-label="Metricas da corrida">
        <article>
          <Diamond size={16} />
          <span>{gemsCollected.toLocaleString()} itens</span>
        </article>
        <article>
          <Sparkles size={16} />
          <span>{formatDistance(distance)}</span>
        </article>
        <article>
          <Zap size={16} />
          <span>Velocidade {Math.round((speed / RUN_SPEED_BASE) * 100)}%</span>
        </article>
      </aside>

      {isImmortalityActive && (
        <div className="ability-badge" role="status">
          <Shield size={16} /> Escudo ativo
        </div>
      )}
    </div>
  );
};

export const HUD: React.FC = () => {
  const status = useStore((state) => state.status);

  if (status === GameStatus.MENU) {
    return <MenuScreen />;
  }

  if (status === GameStatus.SHOP) {
    return <ShopScreen />;
  }

  if (status === GameStatus.GAME_OVER) {
    return <EndScreen mode="loss" />;
  }

  if (status === GameStatus.VICTORY) {
    return <EndScreen mode="win" />;
  }

  return <LiveHud />;
};
