import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { GameScene, type GameStatus, type HudStats, type InputState } from './game-scene';
import './index.css';

const queryClient = new QueryClient();
type ArenaHud = HudStats;
const initialHud: ArenaHud = {
  health: 100,
  shield: 50,
  ammo: 60,
  reserveAmmo: 120,
  grenades: 3,
  score: 0,
  wave: 1,
  bossHealth: 0,
  bossMaxHealth: 0,
  survival: 0,
  enemies: 0,
  radar: [],
  reload: 0,
  damageFlash: 0,
};
const initialInput: InputState = { keys: {}, fire: false, aimX: 0, aimZ: -5, touchX: 0, touchZ: 0 };

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function GameHome() {
  const [status, setStatus] = useState<GameStatus>('menu');
  const [resetKey, setResetKey] = useState(0);
  const [hud, setHud] = useState(initialHud);
  const [best, setBest] = useState(() => Number(localStorage.getItem('arena-survival-high-score') || 0));
  const inputRef = useRef<InputState>({ ...initialInput, keys: {} });
  const [touchActive, setTouchActive] = useState(false);

  const startGame = () => {
    inputRef.current = { ...initialInput, keys: {} };
    setHud(initialHud);
    setResetKey((value) => value + 1);
    setStatus('playing');
  };
  const gameOver = (stats: HudStats) => {
    const nextBest = Math.max(best, stats.score);
    if (nextBest !== best) {
      setBest(nextBest);
      localStorage.setItem('arena-survival-high-score', String(nextBest));
    }
    setHud((current) => ({ ...current, ...stats }));
    setStatus('gameover');
  };
  const pauseGame = () => setStatus((current) => current === 'playing' ? 'paused' : current === 'paused' ? 'playing' : current);
  const updateHud = (stats: HudStats) => {
    setHud((current) => ({ ...current, ...stats }));
  };

  const triggerAction = (code: 'KeyR' | 'KeyG') => {
    inputRef.current.keys[code] = true;
    window.setTimeout(() => { inputRef.current.keys[code] = false; }, 140);
  };

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setStatus((current) => current === 'playing' ? 'paused' : current); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const setTouchVector = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2);
    const z = (event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height / 2);
    const length = Math.hypot(x, z) || 1;
    inputRef.current.touchX = Math.max(-1, Math.min(1, x / Math.max(1, length)));
    inputRef.current.touchZ = Math.max(-1, Math.min(1, z / Math.max(1, length)));
    setTouchActive(true);
  };
  const clearTouch = () => { inputRef.current.touchX = 0; inputRef.current.touchZ = 0; setTouchActive(false); };

  return (
    <main className="arena-app" data-testid="arena-app">
      <div className="game-shell">
        <GameScene
          active={status === 'playing'}
          resetKey={resetKey}
          inputRef={inputRef}
          onHud={updateHud}
          onGameOver={gameOver}
          onPause={pauseGame}
          showCar={status !== 'menu'}
        />
        <div className="hud-layer">
          {status === 'playing' && (
            <>
              <div
                className="damage-flash"
                aria-hidden="true"
                style={{ opacity: Math.min(.42, hud.damageFlash * .42) }}
              />
              <div className="hud-topline">
                <div className="hud-left-cluster">
                  <section className="hud-panel vitals-panel" data-testid="vitals-panel">
                    <div className="panel-kicker"><span className="status-dot" />VITAL SYSTEMS <span className="panel-id">E. THORNE / 07</span></div>
                    <div className="vital-row">
                      <span className="vital-icon health-icon">+</span>
                      <div className="vital-copy"><span>Health</span><strong data-testid="health-stat">{Math.ceil(hud.health)}<small>%</small></strong></div>
                      <div className="meter"><i className="health-meter" style={{ width: `${Math.max(0, Math.min(100, hud.health))}%` }} /></div>
                    </div>
                    <div className="vital-row">
                      <span className="vital-icon shield-icon">◇</span>
                      <div className="vital-copy"><span>Shield</span><strong data-testid="shield-stat">{Math.ceil(hud.shield)}<small>%</small></strong></div>
                      <div className="meter"><i className="shield-meter" style={{ width: `${Math.max(0, Math.min(100, hud.shield))}%` }} /></div>
                    </div>
                  </section>
                  <section className="hud-panel radar-panel" data-testid="radar-panel">
                    <div className="panel-kicker">PROXIMITY <span className="radar-live">LIVE</span></div>
                    <div className="radar-screen" aria-label="Enemy proximity radar">
                      <div className="radar-crosshair horizontal" />
                      <div className="radar-crosshair vertical" />
                      <div className="radar-ring radar-ring-one" />
                      <div className="radar-ring radar-ring-two" />
                      <span className="radar-player" />
                      {hud.radar.map((point, index) => {
                        const rawX = point[0];
                        const rawZ = point[1];
                        const x = Math.max(4, Math.min(96, (rawX + 1) * 50));
                        const z = Math.max(4, Math.min(96, (rawZ + 1) * 50));
                        return <i className="radar-blip" key={`${index}-${rawX}-${rawZ}`} style={{ left: `${x}%`, top: `${z}%` }} />;
                      })}
                    </div>
                  </section>
                </div>
                <div className="hud-right-cluster">
                  <section className="hud-panel mission-panel">
                    <div className="mission-top"><span className="panel-kicker">THREAT INDEX</span><span className="signal-line">///</span></div>
                    <div className="wave-value"><span>WAVE</span><strong data-testid="wave-stat">{hud.wave.toString().padStart(2, '0')}</strong></div>
                    <div className="enemy-count"><span>HOSTILES ACTIVE</span><strong data-testid="enemy-stat">{hud.enemies.toString().padStart(2, '0')}</strong></div>
                    {hud.bossMaxHealth > 0 && hud.bossHealth > 0 && (
                      <div className="mini-boss-health" data-testid="boss-health-panel">
                        <div><span>MINI BOSS</span><strong>{Math.ceil(hud.bossHealth / hud.bossMaxHealth * 100)}%</strong></div>
                        <div className="mini-boss-meter"><i style={{ width: `${Math.max(0, Math.min(100, hud.bossHealth / hud.bossMaxHealth * 100))}%` }} /></div>
                      </div>
                    )}
                  </section>
                  <button className="pause-button" data-testid="pause-button" onClick={pauseGame}><span className="pause-glyph">||</span> Pause</button>
                </div>
              </div>
              <div className="hud-bottomline">
                <div className="score-readout">
                  <span>RUN SCORE</span><strong data-testid="score-stat">{hud.score.toString().padStart(5, '0')}</strong>
                  <span className="survival-readout" data-testid="survival-stat">SURVIVAL <b data-testid="timer-stat">{formatTime(hud.survival)}</b></span>
                </div>
                <section className="hud-panel weapon-panel" data-testid="weapon-panel">
                  <div className="weapon-visual" aria-hidden="true"><span className="rifle-barrel" /><span className="rifle-body" /><span className="rifle-grip" /><span className="rifle-stock" /><span className="rifle-led" /></div>
                  <div className="weapon-data">
                    <div className="weapon-name">VX-9 <span>CARBINE</span></div>
                    <div className="ammo-readout"><strong data-testid="ammo-stat">{hud.ammo.toString().padStart(2, '0')}</strong><span data-testid="reserve-ammo-stat">/ {hud.reserveAmmo.toString().padStart(3, '0')}</span></div>
                    {hud.reload > 0 && <div className="reload-track" aria-label="Reloading"><i style={{ width: `${hud.reload * 100}%` }} /></div>}
                    <div className="weapon-rule" />
                    <div className="weapon-meta"><span>AMMO</span><span className="grenade-count"><i className="grenade-icon" /> <b data-testid="grenade-stat">{hud.grenades}</b></span></div>
                  </div>
                  <div className="weapon-actions">
                    <button className="action-button" data-testid="reload-button" onClick={() => triggerAction('KeyR')}><b>R</b> Reload</button>
                    <button className="action-button" data-testid="grenade-button" onClick={() => triggerAction('KeyG')}><b>G</b> Frag</button>
                  </div>
                </section>
              </div>
              <div className="bottom-hint">WASD / arrows to move <span>•</span> shift to sprint <span>•</span> mouse aim + hold click to fire <span>•</span> P to pause</div>
              <div className="touch-ui">
                <div className="touch-stick touch-control" data-testid="touch-move" onPointerDown={setTouchVector} onPointerMove={(event) => { if (touchActive) setTouchVector(event); }} onPointerUp={clearTouch} onPointerCancel={clearTouch}><span className="stick-core" /></div>
                <div className="touch-actions">
                  <button className="touch-action touch-control" data-testid="touch-reload" onPointerDown={() => triggerAction('KeyR')}>R</button>
                  <button className="touch-action touch-control" data-testid="touch-grenade" onPointerDown={() => triggerAction('KeyG')}>G</button>
                  <button className="fire-control touch-control" data-testid="touch-fire" onPointerDown={(event) => { event.stopPropagation(); inputRef.current.fire = true; }} onPointerUp={() => { inputRef.current.fire = false; }} onPointerCancel={() => { inputRef.current.fire = false; }}>FIRE</button>
                </div>
              </div>
            </>
          )}
          {status === 'menu' && (
            <section className="overlay-card" data-testid="start-screen">
              <div className="menu-mark"><span>07</span><i /></div>
              <div className="eyebrow">SECTOR 07 <span>//</span> SURVIVAL PROTOCOL</div>
              <h1 className="game-title">Arena <span>Survival</span></h1>
              <div className="operator-line"><span>OPERATOR</span> ELIAS “JACK” THORNE <i>•</i> LIVE COMBAT SIMULATION</div>
              <p className="game-copy">The perimeter is gone. Hold the center of the concrete ring, keep moving, and make every clean shot buy another second.</p>
              <button className="primary-button" data-testid="start-button" onClick={startGame}><span>Enter the arena</span><b>→</b></button>
              <div className="control-rail"><span><b className="keycap">WASD</b> Move</span><span><b className="keycap">SHIFT</b> Sprint</span><span><b className="keycap">MOUSE</b> Aim / fire</span><span><b className="keycap">R</b> Reload</span><span><b className="keycap">G</b> Frag</span></div>
              {best > 0 && <div className="local-best">LOCAL BEST <strong>{best.toString().padStart(5, '0')}</strong></div>}
            </section>
          )}
          {status === 'paused' && (
            <section className="overlay-card" data-testid="pause-screen">
              <div className="eyebrow">SIGNAL INTERRUPTED</div>
              <h2 className="game-title compact-title">On hold</h2>
              <p className="game-copy">The swarm is frozen. Resume when you are ready.</p>
              <button className="primary-button" data-testid="resume-button" onClick={pauseGame}><span>Resume run</span><b>→</b></button>
              <div className="secondary-wrap"><button className="secondary-button" data-testid="pause-restart-button" onClick={startGame}>Abort and restart</button></div>
            </section>
          )}
          {status === 'gameover' && (
            <section className="overlay-card" data-testid="game-over-screen">
              <div className="eyebrow danger-eyebrow">RUN TERMINATED</div>
              <h2 className="game-title compact-title">Overrun</h2>
              <div className="result-grid">
                <div><div className="stat-label">Score</div><div className="result-value" data-testid="final-score">{hud.score.toString().padStart(5, '0')}</div></div>
                <div><div className="stat-label">Survived</div><div className="result-value">{formatTime(hud.survival)}</div></div>
                <div><div className="stat-label">Wave</div><div className="result-value">{hud.wave.toString().padStart(2, '0')}</div></div>
              </div>
              <div className="local-best">LOCAL BEST <strong>{best.toString().padStart(5, '0')}</strong></div>
              <button className="primary-button" data-testid="restart-button" onClick={startGame}><span>Run it back</span><b>→</b></button>
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