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
const initialHud: HudStats = { health: 100, score: 0, wave: 1, survival: 0, enemies: 0 };
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
    setHud(stats);
    setStatus('gameover');
  };
  const pauseGame = () => setStatus((current) => current === 'playing' ? 'paused' : current === 'paused' ? 'playing' : current);

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
          onHud={setHud}
          onGameOver={gameOver}
          onPause={pauseGame}
        />
        <div className="hud-layer">
          {status === 'playing' && (
            <>
              <div className="hud-corner">
                <div className="stats-strip">
                  <div className="hud-panel stat-box">
                    <div className="stat-label">Score</div>
                    <div className="stat-value" data-testid="score-stat">{hud.score.toString().padStart(4, '0')}</div>
                  </div>
                  <div className="hud-panel stat-box">
                    <div className="stat-label">Wave</div>
                    <div className="stat-value" data-testid="wave-stat">{hud.wave.toString().padStart(2, '0')}</div>
                  </div>
                  <div className="hud-panel stat-box">
                    <div className="stat-label">Time</div>
                    <div className="stat-value" data-testid="timer-stat">{formatTime(hud.survival)}</div>
                  </div>
                  <div className="hud-panel stat-box">
                    <div className="stat-label">Hull</div>
                    <div className="stat-value">{Math.ceil(hud.health)}<small style={{ fontSize: '.7rem' }}>%</small></div>
                    <div className="health-track"><div className="health-fill" style={{ width: `${hud.health}%` }} /></div>
                  </div>
                </div>
                <button className="pause-button" data-testid="pause-button" onClick={pauseGame}>{'//' } Pause</button>
              </div>
              <div className="bottom-hint">WASD / arrows to move <span style={{ margin: '0 .7rem', color: '#f6c23d' }}>·</span> mouse aim + hold click to fire <span style={{ margin: '0 .7rem', color: '#f6c23d' }}>·</span> P to pause</div>
              <div className="touch-ui">
                <div className="touch-stick touch-control" data-testid="touch-move" onPointerDown={setTouchVector} onPointerMove={(event) => { if (touchActive) setTouchVector(event); }} onPointerUp={clearTouch} onPointerCancel={clearTouch} />
                <button className="fire-control touch-control" data-testid="touch-fire" onPointerDown={(event) => { event.stopPropagation(); inputRef.current.fire = true; }} onPointerUp={() => { inputRef.current.fire = false; }} onPointerCancel={() => { inputRef.current.fire = false; }}>FIRE</button>
              </div>
            </>
          )}
          {status === 'menu' && (
            <section className="overlay-card" data-testid="start-screen">
              <div className="eyebrow">Sector 07 // Survival Protocol</div>
              <h1 className="game-title">Arena <span>Survival</span></h1>
              <p className="game-copy">The perimeter is gone. Swarms are inbound. Hold the center, keep moving, and turn every clean shot into another second alive.</p>
              <button className="primary-button" data-testid="start-button" onClick={startGame}>Enter the arena</button>
              <div className="control-rail"><span><b className="keycap">WASD</b> Move</span><span><b className="keycap">MOUSE</b> Aim + fire</span></div>
              {best > 0 && <div style={{ marginTop: '1.4rem', color: 'hsl(var(--primary))', fontSize: '.65rem', letterSpacing: '.12em' }}>LOCAL BEST / {best.toString().padStart(4, '0')}</div>}
            </section>
          )}
          {status === 'paused' && (
            <section className="overlay-card" data-testid="pause-screen">
              <div className="eyebrow">Signal interrupted</div>
              <h2 className="game-title" style={{ fontSize: 'clamp(3.5rem, 10vw, 5.8rem)' }}>On hold</h2>
              <p className="game-copy">The swarm is frozen. Take a breath, then get back into the light.</p>
              <button className="primary-button" data-testid="resume-button" onClick={pauseGame}>Resume run</button>
              <div style={{ marginTop: '1.1rem' }}><button className="secondary-button" onClick={startGame}>Abort and restart</button></div>
            </section>
          )}
          {status === 'gameover' && (
            <section className="overlay-card" data-testid="game-over-screen">
              <div className="eyebrow">Run terminated</div>
              <h2 className="game-title" style={{ fontSize: 'clamp(3.2rem, 10vw, 5.8rem)' }}>Overrun</h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '1.4rem 0 1.7rem' }}>
                <div><div className="stat-label">Score</div><div className="stat-value" data-testid="final-score">{hud.score.toString().padStart(4, '0')}</div></div>
                <div><div className="stat-label">Survived</div><div className="stat-value">{formatTime(hud.survival)}</div></div>
                <div><div className="stat-label">Wave</div><div className="stat-value">{hud.wave.toString().padStart(2, '0')}</div></div>
              </div>
              <div style={{ color: 'hsl(var(--primary))', fontSize: '.65rem', letterSpacing: '.12em', marginBottom: '1.3rem' }}>LOCAL BEST / {best.toString().padStart(4, '0')}</div>
              <button className="primary-button" data-testid="restart-button" onClick={startGame}>Run it back</button>
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