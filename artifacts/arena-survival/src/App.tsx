import { type CSSProperties, type PointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { capturePointer, GameScene, releasePointer, type GameStatus, type HudStats } from './game-scene';
import { applyPerk, buyItem, canBuy, createInput, freshEngine, shopPrice, startLevel, toHud, type Engine, type InputState } from './game-simulation';
import { LEVELS, PERKS, SHOP_ITEMS, type PerkId, type ShopItemId } from './game-levels';
import './index.css';

const queryClient = new QueryClient();
const BEST_KEY = 'arena-survival-high-score';
const REACHED_KEY = 'arena-survival-furthest-level';

function readNumber(key: string) {
  try {
    return Number(localStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
}
function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage can be unavailable (private mode); progress just won't persist.
  }
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

const pct = (value: number, max: number) => `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%`;

function Meter({ label, icon, value, max, tone }: { label: string; icon: string; value: number; max: number; tone: string }) {
  return (
    <div className="vital-row">
      <span className={`vital-icon ${tone}-icon`}>{icon}</span>
      <div className="vital-copy"><span>{label}</span><strong data-testid={`${tone}-stat`}>{Math.ceil(value)}<small>/{Math.round(max)}</small></strong></div>
      <div className="meter"><i className={`${tone}-meter`} style={{ width: pct(value, max) }} /></div>
    </div>
  );
}

function AbilitySlot({ keyLabel, name, cooldown, ready, count, onTrigger }: {
  keyLabel: string; name: string; cooldown: number; ready: boolean; count?: number; onTrigger: () => void;
}) {
  return (
    <button
      className={`ability-slot ${ready ? 'is-ready' : 'is-cooling'}`}
      style={{ '--cooldown': `${cooldown * 360}deg` } as CSSProperties}
      onPointerDown={(event) => { event.stopPropagation(); onTrigger(); }}
    >
      <span className="ability-sweep" aria-hidden="true" />
      <b>{keyLabel}</b>
      <span className="ability-name">{name}</span>
      {count !== undefined && <i className="ability-count">{count}</i>}
    </button>
  );
}

function GameHome() {
  const [status, setStatus] = useState<GameStatus>('menu');
  const [resetKey, setResetKey] = useState(0);
  const engineRef = useRef<Engine>(freshEngine());
  const checkpointRef = useRef<Engine | null>(null);
  const [hud, setHud] = useState<HudStats>(() => toHud(engineRef.current));
  const [best, setBest] = useState(() => readNumber(BEST_KEY));
  const [reached, setReached] = useState(() => readNumber(REACHED_KEY));
  const inputRef = useRef<InputState>(createInput());
  const [touchActive, setTouchActive] = useState(false);
  const [stick, setStick] = useState({ x: 0, y: 0 });

  const refreshHud = () => setHud(toHud(engineRef.current));
  const saveCheckpoint = () => { checkpointRef.current = structuredClone(engineRef.current); };
  const recordBest = (score: number) => {
    if (score > best) {
      setBest(score);
      writeNumber(BEST_KEY, score);
    }
  };
  const recordReached = (levelIndex: number) => {
    if (levelIndex > reached) {
      setReached(levelIndex);
      writeNumber(REACHED_KEY, levelIndex);
    }
  };

  const beginPlay = () => {
    inputRef.current = { ...createInput(), cameraYaw: inputRef.current.cameraYaw };
    setStatus('playing');
    capturePointer();
  };

  const startGame = () => {
    engineRef.current = freshEngine();
    saveCheckpoint();
    refreshHud();
    setResetKey((value) => value + 1);
    beginPlay();
  };

  const retryLevel = () => {
    if (!checkpointRef.current) return startGame();
    const restored = structuredClone(checkpointRef.current);
    startLevel(restored, restored.levelIndex);
    engineRef.current = restored;
    refreshHud();
    setResetKey((value) => value + 1);
    beginPlay();
  };

  const gameOver = (stats: HudStats) => {
    releasePointer();
    recordBest(stats.score);
    setHud(stats);
    setStatus('gameover');
  };
  const statusRef = useRef(status);
  statusRef.current = status;
  const pauseGame = useCallback(() => {
    if (statusRef.current === 'playing') {
      releasePointer();
      setStatus('paused');
    } else if (statusRef.current === 'paused') {
      capturePointer();
      setStatus('playing');
    }
  }, []);
  const levelUp = () => {
    releasePointer();
    inputRef.current.fire = false;
    setStatus('levelup');
  };
  const levelComplete = (stats: HudStats) => {
    releasePointer();
    inputRef.current.fire = false;
    setHud(stats);
    recordBest(stats.score);
    recordReached(stats.levelIndex + 1);
    setStatus(stats.victory ? 'victory' : 'shop');
  };

  const choosePerk = (perk: PerkId) => {
    applyPerk(engineRef.current, perk);
    refreshHud();
    if (engineRef.current.pendingLevelUps <= 0) beginPlay();
  };
  const buy = (item: ShopItemId) => {
    if (buyItem(engineRef.current, item)) refreshHud();
  };
  const deploy = () => {
    startLevel(engineRef.current, engineRef.current.levelIndex + 1);
    saveCheckpoint();
    refreshHud();
    beginPlay();
  };

  const triggerAction = (code: string) => {
    inputRef.current.keys[code] = true;
    window.setTimeout(() => { inputRef.current.keys[code] = false; }, 120);
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setStatus((current) => current === 'playing' ? 'paused' : current);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (status !== 'levelup') return;
    const onKey = (event: KeyboardEvent) => {
      const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
      const choice = engineRef.current.perkChoices[index];
      if (choice) choosePerk(choice);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const setTouchVector = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2);
    const z = (event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height / 2);
    const length = Math.hypot(x, z);
    const scale = length > 1 ? 1 / length : 1;
    inputRef.current.touchX = x * scale;
    inputRef.current.touchZ = z * scale;
    setStick({ x: x * scale, y: z * scale });
    setTouchActive(true);
  };
  const clearTouch = () => {
    inputRef.current.touchX = 0;
    inputRef.current.touchZ = 0;
    setStick({ x: 0, y: 0 });
    setTouchActive(false);
  };

  const inGame = status === 'playing' || status === 'paused' || status === 'levelup';
  const level = LEVELS[hud.levelIndex] ?? LEVELS[0];
  const nextLevel = LEVELS[hud.levelIndex + 1];

  return (
    <main className="arena-app" data-testid="arena-app" style={{ '--level-accent': level.theme.accent } as CSSProperties}>
      <div className="game-shell">
        <GameScene
          active={status === 'playing'}
          started={status !== 'menu'}
          resetKey={resetKey}
          levelIndex={hud.levelIndex}
          engineRef={engineRef}
          inputRef={inputRef}
          onHud={setHud}
          onGameOver={gameOver}
          onPause={pauseGame}
          onLevelUp={levelUp}
          onLevelComplete={levelComplete}
        />
        <div className="hud-layer">
          {inGame && (
            <>
              <div className="damage-flash" aria-hidden="true" style={{ opacity: Math.min(.5, hud.damageFlash * .5) }} />
              <div className={`crosshair ${hud.hitMarker > .8 ? 'is-crit' : hud.hitMarker > 0 ? 'is-hit' : ''}`} aria-hidden="true">
                <i /><i /><i /><i />
              </div>
              {hud.hazard && <div className="hazard-warning">⚠ {hud.hazard}</div>}
              {hud.banner && (
                <div key={hud.banner.id} className={`level-banner banner-${hud.banner.tone}`}>
                  <strong>{hud.banner.title}</strong>
                  <span>{hud.banner.sub}</span>
                </div>
              )}

              <div className="hud-topline">
                <div className="hud-left-cluster">
                  <section className="hud-panel vitals-panel" data-testid="vitals-panel">
                    <div className="panel-kicker"><span className="status-dot" />E. THORNE <span className="level-badge">LV {hud.charLevel}</span></div>
                    <Meter label="Health" icon="+" value={hud.health} max={hud.maxHealth} tone="health" />
                    <Meter label="Shield" icon="◇" value={hud.shield} max={hud.maxShield} tone="shield" />
                    <Meter label="Energy" icon="◆" value={hud.energy} max={hud.maxEnergy} tone="energy" />
                    <div className="xp-row">
                      <span>XP</span>
                      <div className="xp-track"><i style={{ width: pct(hud.xp, hud.xpNext) }} /></div>
                      <b>{Math.floor(hud.xp)}/{hud.xpNext}</b>
                    </div>
                  </section>
                </div>

                <div className="hud-center-cluster">
                  {hud.boss ? (
                    <section className="boss-panel" data-testid="boss-panel">
                      <div className="boss-name"><strong>{hud.boss.name}</strong><span>{hud.boss.title}</span></div>
                      <div className="boss-track"><i style={{ width: pct(hud.boss.health, hud.boss.maxHealth) }} /></div>
                    </section>
                  ) : (
                    <section className="hud-panel objective-panel">
                      <div className="panel-kicker">LEVEL {hud.levelIndex + 1} // {hud.levelName}</div>
                      <div className="objective-text" data-testid="objective">{hud.objective}</div>
                      <div className="wave-pips">
                        {Array.from({ length: hud.waveCount }, (_, index) => (
                          <i key={index} className={index < hud.waveIndex || (hud.phase !== 'wave' && hud.phase !== 'intro' && hud.phase !== 'intermission') ? 'done' : index === hud.waveIndex && hud.phase === 'wave' ? 'live' : ''} />
                        ))}
                        <i className={`boss-pip ${hud.phase === 'boss' || hud.phase === 'bossIntro' ? 'live' : hud.phase === 'cleared' ? 'done' : ''}`} />
                      </div>
                    </section>
                  )}
                </div>

                <div className="hud-right-cluster">
                  <section className="hud-panel radar-panel" data-testid="radar-panel">
                    <div className="panel-kicker">PROXIMITY <span className="radar-live">{hud.enemies.toString().padStart(2, '0')}</span></div>
                    <div className="radar-screen" aria-label="Enemy proximity radar">
                      <div className="radar-crosshair horizontal" />
                      <div className="radar-crosshair vertical" />
                      <div className="radar-ring radar-ring-one" />
                      <div className="radar-ring radar-ring-two" />
                      <span className="radar-player" />
                      {hud.radar.map((point, index) => (
                        <i
                          className={`radar-blip ${point[2] === 2 ? 'boss' : point[2] === 1 ? 'elite' : ''}`}
                          key={index}
                          style={{ left: `${Math.max(4, Math.min(96, (point[0] + 1) * 50))}%`, top: `${Math.max(4, Math.min(96, (point[1] + 1) * 50))}%` }}
                        />
                      ))}
                    </div>
                  </section>
                  <div className="right-stack">
                    <div className="gold-readout" data-testid="gold-stat"><i className="coin" />{hud.gold}</div>
                    <button className="pause-button" data-testid="pause-button" onClick={pauseGame}><span className="pause-glyph">||</span> Pause</button>
                  </div>
                </div>
              </div>

              <div className="hud-bottomline">
                <div className="score-readout">
                  <span>SCORE</span><strong data-testid="score-stat">{hud.score.toString().padStart(6, '0')}</strong>
                  <span className="survival-readout">TIME <b data-testid="timer-stat">{formatTime(hud.survival)}</b></span>
                </div>
                <div className="ability-bar">
                  <AbilitySlot keyLabel="Q" name="Dash" cooldown={hud.abilities.dash.cooldown} ready={hud.abilities.dash.ready} onTrigger={() => triggerAction('KeyQ')} />
                  <AbilitySlot keyLabel="E" name="Nova" cooldown={hud.abilities.nova.cooldown} ready={hud.abilities.nova.ready} onTrigger={() => triggerAction('KeyE')} />
                  <AbilitySlot keyLabel="F" name="Strike" cooldown={hud.abilities.melee.cooldown} ready={hud.abilities.melee.ready} onTrigger={() => triggerAction('KeyF')} />
                  <AbilitySlot keyLabel="G" name="Frag" cooldown={hud.abilities.grenade.cooldown} ready={hud.abilities.grenade.ready} count={hud.grenades} onTrigger={() => triggerAction('KeyG')} />
                </div>
                <section className="hud-panel weapon-panel" data-testid="weapon-panel">
                  <div className="weapon-data">
                    <div className="weapon-name">VX-9 <span>CARBINE</span></div>
                    <div className="ammo-readout"><strong data-testid="ammo-stat">{hud.ammo.toString().padStart(2, '0')}</strong><span data-testid="reserve-ammo-stat">/ {hud.reserveAmmo.toString().padStart(3, '0')}</span></div>
                    {hud.reload > 0 && <div className="reload-track" aria-label="Reloading"><i style={{ width: `${hud.reload * 100}%` }} /></div>}
                  </div>
                  <button className="action-button" data-testid="reload-button" onClick={() => triggerAction('KeyR')}><b>R</b> Reload</button>
                </section>
              </div>

              <div className="touch-ui">
                <div
                  className="touch-stick touch-control"
                  data-testid="touch-move"
                  onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setTouchVector(event); }}
                  onPointerMove={(event) => { if (touchActive) setTouchVector(event); }}
                  onPointerUp={clearTouch}
                  onPointerCancel={clearTouch}
                >
                  <span className="stick-core" style={{ transform: `translate(${stick.x * 34}px, ${stick.y * 34}px)` }} />
                </div>
                <div className="touch-actions">
                  <button className="touch-action touch-control" onPointerDown={() => triggerAction('KeyQ')}>Q</button>
                  <button className="touch-action touch-control" onPointerDown={() => triggerAction('KeyE')}>E</button>
                  <button className="touch-action touch-control" onPointerDown={() => triggerAction('KeyF')}>F</button>
                  <button className="touch-action touch-control" onPointerDown={() => triggerAction('KeyG')}>G</button>
                  <button
                    className="fire-control touch-control"
                    data-testid="touch-fire"
                    onPointerDown={(event) => { event.stopPropagation(); inputRef.current.fire = true; }}
                    onPointerUp={() => { inputRef.current.fire = false; }}
                    onPointerCancel={() => { inputRef.current.fire = false; }}
                  >FIRE</button>
                </div>
                <div className="touch-look-hint">Drag to look</div>
              </div>
            </>
          )}

          {status === 'menu' && (
            <section className="overlay-card menu-card" data-testid="start-screen">
              <div className="menu-mark"><span>07</span><i /></div>
              <div className="eyebrow">A 3D ACTION RPG <span>//</span> FIVE ARENAS</div>
              <h1 className="game-title">Arena <span>Survival</span></h1>
              <div className="operator-line"><span>OPERATOR</span> ELIAS “JACK” THORNE <i>•</i> THIRD-PERSON CAMPAIGN</div>
              <p className="game-copy">Fight through five hostile arenas, level up, pick perks, spend salvage between fights and bring down each arena's boss.</p>
              <ol className="campaign-map">
                {LEVELS.map((entry, index) => (
                  <li key={entry.id} className={index <= reached ? 'unlocked' : 'locked'} style={{ '--accent': entry.theme.accent } as CSSProperties}>
                    <b>{entry.id.toString().padStart(2, '0')}</b>
                    <span>{index <= reached ? entry.name : 'Unknown sector'}</span>
                  </li>
                ))}
              </ol>
              <button className="primary-button" data-testid="start-button" onClick={startGame}><span>Begin campaign</span><b>→</b></button>
              <div className="control-rail">
                <span><b className="keycap">WASD</b> Move</span>
                <span><b className="keycap">MOUSE</b> Look / fire</span>
                <span><b className="keycap">SHIFT</b> Sprint</span>
                <span><b className="keycap">Q</b> Dash</span>
                <span><b className="keycap">E</b> Nova</span>
                <span><b className="keycap">F</b> Strike</span>
                <span><b className="keycap">G</b> Frag</span>
                <span><b className="keycap">R</b> Reload</span>
              </div>
              {best > 0 && <div className="local-best">LOCAL BEST <strong>{best.toString().padStart(6, '0')}</strong></div>}
            </section>
          )}

          {status === 'paused' && (
            <section className="overlay-card" data-testid="pause-screen">
              <div className="eyebrow">SIGNAL INTERRUPTED</div>
              <h2 className="game-title compact-title">On hold</h2>
              <p className="game-copy">Level {hud.levelIndex + 1} - {hud.levelName}. Character level {hud.charLevel}, {hud.gold} gold banked.</p>
              <button className="primary-button" data-testid="resume-button" onClick={pauseGame}><span>Resume</span><b>→</b></button>
              <div className="secondary-wrap">
                <button className="secondary-button" data-testid="pause-retry-button" onClick={retryLevel}>Restart level</button>
                <button className="secondary-button" data-testid="pause-restart-button" onClick={startGame}>New campaign</button>
              </div>
            </section>
          )}

          {status === 'levelup' && (
            <section className="overlay-card perk-card" data-testid="levelup-screen">
              <div className="eyebrow gold-eyebrow">LEVEL UP <span>//</span> RANK {hud.charLevel}</div>
              <h2 className="game-title compact-title">Choose a perk</h2>
              <div className="perk-grid">
                {hud.perkChoices.map((perkId, index) => {
                  const perk = PERKS.find((entry) => entry.id === perkId)!;
                  const rank = hud.perks[perkId] ?? 0;
                  return (
                    <button key={perkId} className="perk-option" data-testid={`perk-${perkId}`} onClick={() => choosePerk(perkId)}>
                      <span className="perk-key">{index + 1}</span>
                      <span className="perk-icon">{perk.icon}</span>
                      <strong>{perk.name}</strong>
                      <span className="perk-blurb">{perk.blurb}</span>
                      <span className="perk-rank">{Array.from({ length: perk.max }, (_, pip) => <i key={pip} className={pip < rank ? 'on' : pip === rank ? 'next' : ''} />)}</span>
                    </button>
                  );
                })}
              </div>
              {hud.pendingLevelUps > 1 && <div className="local-best">{hud.pendingLevelUps - 1} MORE PERK{hud.pendingLevelUps > 2 ? 'S' : ''} TO CHOOSE</div>}
            </section>
          )}

          {status === 'shop' && (
            <section className="overlay-card shop-card" data-testid="shop-screen">
              <div className="eyebrow">LEVEL {hud.levelIndex + 1} CLEARED <span>//</span> THE ARMORY</div>
              <h2 className="game-title compact-title">Resupply</h2>
              <div className="result-grid">
                <div><div className="stat-label">Score</div><div className="result-value">{hud.score.toString().padStart(6, '0')}</div></div>
                <div><div className="stat-label">Rank</div><div className="result-value">LV {hud.charLevel}</div></div>
                <div><div className="stat-label">Gold</div><div className="result-value gold-text" data-testid="shop-gold">{hud.gold}</div></div>
              </div>
              <div className="shop-grid">
                {SHOP_ITEMS.map((item) => {
                  const price = shopPrice(engineRef.current, item.id);
                  return (
                    <button key={item.id} className="shop-item" data-testid={`shop-${item.id}`} disabled={!canBuy(engineRef.current, item.id)} onClick={() => buy(item.id)}>
                      <strong>{item.name}</strong>
                      <span>{item.blurb}</span>
                      <b><i className="coin" />{price}</b>
                    </button>
                  );
                })}
              </div>
              <div className="shop-status">HP {Math.ceil(hud.health)}/{hud.maxHealth} · AMMO {hud.ammo}+{hud.reserveAmmo} · FRAGS {hud.grenades}</div>
              {nextLevel && (
                <div className="next-briefing">
                  <span>NEXT // LEVEL {nextLevel.id} - {nextLevel.name}</span>
                  <p>{nextLevel.briefing}</p>
                </div>
              )}
              <button className="primary-button" data-testid="deploy-button" onClick={deploy}><span>Deploy</span><b>→</b></button>
            </section>
          )}

          {(status === 'gameover' || status === 'victory') && (
            <section className="overlay-card" data-testid={status === 'victory' ? 'victory-screen' : 'game-over-screen'}>
              <div className={`eyebrow ${status === 'victory' ? 'gold-eyebrow' : 'danger-eyebrow'}`}>{status === 'victory' ? 'CAMPAIGN COMPLETE' : 'RUN TERMINATED'}</div>
              <h2 className="game-title compact-title">{status === 'victory' ? 'Champion' : 'Overrun'}</h2>
              {status === 'victory' && <p className="game-copy">The Hollow King is dust. The ring is quiet - for now.</p>}
              <div className="result-grid">
                <div><div className="stat-label">Score</div><div className="result-value" data-testid="final-score">{hud.score.toString().padStart(6, '0')}</div></div>
                <div><div className="stat-label">Time</div><div className="result-value">{formatTime(hud.survival)}</div></div>
                <div><div className="stat-label">Level</div><div className="result-value">{hud.levelIndex + 1}/{LEVELS.length}</div></div>
                <div><div className="stat-label">Kills</div><div className="result-value">{hud.kills}</div></div>
              </div>
              <div className="local-best">LOCAL BEST <strong>{best.toString().padStart(6, '0')}</strong></div>
              {status === 'gameover' && (
                <button className="primary-button" data-testid="retry-button" onClick={retryLevel}><span>Retry level {hud.levelIndex + 1}</span><b>→</b></button>
              )}
              <div className="secondary-wrap">
                <button className={status === 'victory' ? 'primary-button' : 'secondary-button'} data-testid="restart-button" onClick={startGame}>New campaign</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={GameHome} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}
export default App;
