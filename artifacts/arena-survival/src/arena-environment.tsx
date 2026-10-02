import { Component, type MutableRefObject, type ReactNode, Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getConcreteTextures, getWoodTextures, tiledTexture } from './arena-textures';
import { ARENA_SURFACES, upgradeMaterialTextures } from './real-textures';
import { Prop, getGlowTexture } from './arena-props';
import type { Hazard, LevelDef, Obstacle } from './game-levels';
import { ventState, type Engine } from './game-simulation';

/**
 * Everything static about the arena: materials, geometry, hazards and the
 * level's lighting. Split out of game-scene.tsx so the arena can be upgraded
 * (and later swapped for GLB props) without touching the game loop.
 */

// ── Materials ───────────────────────────────────────────────────────────────

function concreteMaterial(color: THREE.ColorRepresentation, repeatX: number, repeatY: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const concrete = getConcreteTextures();
  return new THREE.MeshStandardMaterial({
    map: tiledTexture(concrete.map, repeatX, repeatY),
    normalMap: tiledTexture(concrete.normalMap, repeatX, repeatY),
    normalScale: new THREE.Vector2(.6, .6),
    roughnessMap: tiledTexture(concrete.roughnessMap, repeatX, repeatY),
    roughness: 1,
    metalness: .04,
    color,
    envMapIntensity: .55,
    ...extra,
  });
}

function metalMaterial(color: THREE.ColorRepresentation) {
  return new THREE.MeshStandardMaterial({ color, roughness: .5, metalness: .55, envMapIntensity: .8 });
}

type ArenaMaterials = ReturnType<typeof useArenaMaterials>;

function useArenaMaterials(level: LevelDef) {
  const materials = useMemo(() => {
    const { theme, radius } = level;
    const wood = getWoodTextures();
    return {
      floor: concreteMaterial(theme.floor, radius * .55, radius * .55),
      wall: concreteMaterial(theme.wall, 26, 2, { side: THREE.DoubleSide }),
      tier: concreteMaterial(theme.wall, 30, 1.5, { color: new THREE.Color(theme.wall).multiplyScalar(.55) }),
      barrier: concreteMaterial(theme.floor, 1.4, .9),
      pillar: concreteMaterial(theme.wall, 1, 3),
      buttress: concreteMaterial(theme.wall, 1, 3, { color: new THREE.Color(theme.wall).multiplyScalar(.85) }),
      crate: new THREE.MeshStandardMaterial({
        map: tiledTexture(wood.map, 1, 1),
        normalMap: tiledTexture(wood.normalMap, 1, 1),
        normalScale: new THREE.Vector2(.5, .5),
        roughness: .86,
        metalness: .02,
      }),
      accent: new THREE.MeshBasicMaterial({ color: theme.accent, toneMapped: false }),
      accentFaint: new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: .35, toneMapped: false, depthWrite: false }),
      crown: metalMaterial('#8b9aa1'),
      trim: metalMaterial('#8b9aa1'),
      dark: new THREE.MeshStandardMaterial({ color: '#141a20', roughness: .9 }),
      grime: new THREE.MeshBasicMaterial({
        color: '#000000', alphaMap: getGrimeGradient(), transparent: true, opacity: .55, depthWrite: false, side: THREE.BackSide,
      }),
    };
  }, [level]);

  useEffect(() => {
    const r = level.radius;
    const concrete = { normalScale: .9, bumpScale: .05 };
    upgradeMaterialTextures(materials.floor, ARENA_SURFACES.floor, r * .55, r * .55, concrete);
    upgradeMaterialTextures(materials.wall, ARENA_SURFACES.wall, 26, 2, concrete);
    upgradeMaterialTextures(materials.tier, ARENA_SURFACES.wall, 30, 1.5, concrete);
    upgradeMaterialTextures(materials.barrier, ARENA_SURFACES.wall, 1.4, .9, concrete);
    upgradeMaterialTextures(materials.pillar, ARENA_SURFACES.wall, 1, 3, concrete);
    upgradeMaterialTextures(materials.buttress, ARENA_SURFACES.wall, 1, 3, concrete);
    upgradeMaterialTextures(materials.crate, ARENA_SURFACES.crate, 1, 1, { normalScale: .8, bumpScale: .03 });
    upgradeMaterialTextures(materials.crown, ARENA_SURFACES.metal, 12, 12);
    upgradeMaterialTextures(materials.trim, ARENA_SURFACES.metal, 2, .3);
    return () => {
      for (const material of Object.values(materials)) material.dispose();
    };
  }, [level, materials]);
  return materials;
}

/** Vertical alpha gradient (opaque at the bottom) for soot/water staining at the wall base. */
let grimeGradient: THREE.CanvasTexture | null = null;
function getGrimeGradient() {
  if (grimeGradient) return grimeGradient;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, '#000');
  gradient.addColorStop(.55, '#222');
  gradient.addColorStop(1, '#fff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 128);
  grimeGradient = new THREE.CanvasTexture(canvas);
  return grimeGradient;
}

// ── Geometry helpers ────────────────────────────────────────────────────────

type MeshProps = Omit<ThreeElements['mesh'], 'geometry' | 'material' | 'args'>;

/**
 * A box with rounded edges. Hard 90° edges are the biggest "primitive" tell
 * next to the GLB models: real edges catch a thin highlight from the HDRI.
 */
function Bevelled({ size, radius = .04, material, ...props }: MeshProps & {
  size: [number, number, number];
  radius?: number;
  material: THREE.Material;
}) {
  const [w, h, d] = size;
  const geometry = useMemo(() => {
    const safeRadius = Math.max(.001, Math.min(radius, Math.min(w, h, d) / 2 - .002));
    return new RoundedBoxGeometry(w, h, d, 3, safeRadius);
  }, [w, h, d, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} {...props} />;
}

// ── Hazards ─────────────────────────────────────────────────────────────────

function HazardMesh({ hazard, engineRef, accent }: { hazard: Hazard; engineRef: MutableRefObject<Engine>; accent: string }) {
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const flameMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const ventGlowRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const time = engineRef.current.time;
    if (hazard.kind === 'toxic') {
      if (glowRef.current) glowRef.current.emissiveIntensity = .7 + Math.sin(clock.elapsedTime * 2 + hazard.x) * .25;
      return;
    }
    const vent = ventState(hazard, time);
    if (glowRef.current) glowRef.current.emissiveIntensity = vent.state === 'active' ? 3.2 : vent.state === 'warn' ? .4 + vent.intensity * 2 * (.6 + Math.sin(clock.elapsedTime * 22) * .4) : .15;
    // Additive heat glow over the GLB grate: faint idle, flickering warning, full blast when active.
    if (ventGlowRef.current) ventGlowRef.current.opacity = vent.state === 'active' ? .95 : vent.state === 'warn' ? .12 + vent.intensity * .55 * (.6 + Math.sin(clock.elapsedTime * 22) * .4) : .06;
    if (flameRef.current && flameMaterialRef.current) {
      flameRef.current.visible = vent.state === 'active';
      flameRef.current.scale.set(hazard.radius * .8, 3 + Math.sin(clock.elapsedTime * 30) * .4, hazard.radius * .8);
      flameMaterialRef.current.opacity = .55 + Math.sin(clock.elapsedTime * 40) * .1;
    }
  });
  if (hazard.kind === 'toxic') {
    const liquid = (y: number) => (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <circleGeometry args={[hazard.radius, 48]} />
        <meshStandardMaterial ref={glowRef} color="#2f6b3c" emissive="#46d672" emissiveIntensity={.8} roughness={.12} metalness={.3} transparent opacity={.9} />
      </mesh>
    );
    const procedural = (
      <>
        {liquid(0)}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .004, 0]}>
          <ringGeometry args={[hazard.radius - .08, hazard.radius, 40]} />
          <meshBasicMaterial color="#9dffb8" transparent opacity={.6} toneMapped={false} />
        </mesh>
      </>
    );
    // The drain's lip sits just outside the damage radius; the liquid is
    // raised to fill the basin so the grate inside it is submerged.
    const outer = hazard.radius * 2.5;
    return (
      <group position={[hazard.x, .012, hazard.z]}>
        <Prop name="toxic_drain" size={[outer, .36, outer]} fallback={procedural} overlay={liquid(.26)} />
      </group>
    );
  }
  const procedural = (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[hazard.radius, 32]} />
        <meshStandardMaterial color="#1a1512" roughness={.7} metalness={.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .006, 0]}>
        <circleGeometry args={[hazard.radius * .72, 32]} />
        <meshStandardMaterial ref={glowRef} color="#3a1606" emissive={accent} emissiveIntensity={.15} roughness={.5} />
      </mesh>
      {[0, 1, 2, 3, 4].map((index) => (
        <mesh key={index} position={[0, .03, (index - 2) * hazard.radius * .3]}>
          <boxGeometry args={[hazard.radius * 1.5 * Math.cos(((index - 2) / 3) * Math.PI * .5), .04, .07]} />
          <meshStandardMaterial color="#2b2522" metalness={.7} roughness={.4} />
        </mesh>
      ))}
    </>
  );
  // The vent model is sunk into the floor so only its rim and grate show
  // (top ~22 cm, enough to keep the recessed grate above the floor plane), which avoids squashing it to floor height.
  const ventTop = .22;
  const heatGlow = (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ventTop + .01, 0]}>
      <circleGeometry args={[hazard.radius * .85, 40]} />
      <meshBasicMaterial ref={ventGlowRef} color={accent} transparent opacity={.06} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
  return (
    <group position={[hazard.x, .012, hazard.z]}>
      <Prop
        name="floor_vent"
        position={[0, ventTop, 0]}
        align="top"
        size={[hazard.radius * 2.6, 10, hazard.radius * 2.6]}
        maxStretch={1}
        fallback={procedural}
        overlay={heatGlow}
      />
      <mesh ref={flameRef} position={[0, 1.5, 0]} visible={false}>
        <cylinderGeometry args={[.35, 1, 1, 18, 1, true]} />
        <meshBasicMaterial ref={flameMaterialRef} color="#ff8a3d" transparent opacity={.6} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── Arena ───────────────────────────────────────────────────────────────────

export function ArenaGeometry({ level, engineRef }: { level: LevelDef; engineRef: MutableRefObject<Engine> }) {
  const materials = useArenaMaterials(level);
  const radius = level.radius;
  const wallRadius = radius + 1;
  const buttresses = useMemo(() => Array.from({ length: 40 }, (_, index) => {
    const angle = (index / 40) * Math.PI * 2;
    return { angle, x: Math.cos(angle) * (wallRadius - .12), z: Math.sin(angle) * (wallRadius - .12) };
  }), [wallRadius]);
  const towers = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  const panels = useMemo(() => {
    const bays = 40;
    const rows = 3;
    const rowHeight = 3.4 / rows;
    const panelRadius = wallRadius - .1;
    const chord = 2 * panelRadius * Math.sin(Math.PI / bays);
    return Array.from({ length: bays * rows }, (_, i) => {
      const bay = i % bays;
      const row = Math.floor(i / bays);
      const angle = ((bay + .5) / bays) * Math.PI * 2;
      return {
        key: i,
        position: [Math.cos(angle) * panelRadius, row * rowHeight + rowHeight / 2, Math.sin(angle) * panelRadius] as [number, number, number],
        // Local +z (the panel's face) points at the arena centre.
        yaw: Math.atan2(-Math.cos(angle), -Math.sin(angle)),
        // Every so often a panel is hung upside down so the bolt pattern doesn't repeat.
        flip: (bay * 7 + row * 3) % 5 === 0,
        size: [chord, rowHeight - .02, .19] as [number, number, number],
      };
    });
  }, [wallRadius]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.02, 0]} receiveShadow>
        <circleGeometry args={[wallRadius + .1, 96]} />
        <primitive object={materials.floor} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .004, 0]}>
        <ringGeometry args={[radius - .12, radius, 128]} />
        <primitive object={materials.accent} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .005, 0]}>
        <ringGeometry args={[radius * .5 - .05, radius * .5, 96]} />
        <primitive object={materials.accentFaint} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .005, 0]}>
        <ringGeometry args={[1.1, 1.18, 48]} />
        <primitive object={materials.accentFaint} attach="material" />
      </mesh>

      {/* Perimeter wall, base grime, buttresses and LED crown */}
      <mesh position={[0, 1.7, 0]} receiveShadow>
        <cylinderGeometry args={[wallRadius, wallRadius, 3.4, 128, 1, true]} />
        <primitive object={materials.wall} attach="material" />
      </mesh>
      <mesh position={[0, .6, 0]} renderOrder={1}>
        <cylinderGeometry args={[wallRadius - .015, wallRadius - .015, 1.2, 128, 1, true]} />
        <primitive object={materials.grime} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 3.4, 0]}>
        <ringGeometry args={[wallRadius - .05, wallRadius + .5, 96]} />
        <primitive object={materials.crown} attach="material" />
      </mesh>
      {panels.map((panel) => (
        <group key={panel.key} position={panel.position} rotation={[0, panel.yaw, 0]}>
          <group rotation={[0, 0, panel.flip ? Math.PI : 0]}>
            <Prop name="wall_panel" position={[0, -panel.size[1] / 2, 0]} size={panel.size} castShadow={false} />
          </group>
        </group>
      ))}
      <mesh position={[0, 2.95, 0]}>
        <cylinderGeometry args={[wallRadius - .22, wallRadius - .22, .07, 96, 1, true]} />
        <meshBasicMaterial color={level.theme.accent} toneMapped={false} side={THREE.BackSide} />
      </mesh>
      {buttresses.map(({ angle, x, z }, index) => (
        <group key={index} position={[x, 1.7, z]} rotation={[0, -angle, 0]}>
          <Bevelled size={[.4, 3.4, .5]} radius={.05} material={materials.buttress} castShadow receiveShadow />
          {/* Local +x points away from the arena; the footing hugs the wall. */}
          <Prop name="buttress" position={[-.18, -1.7, 0]} size={[.6, 1.1, .75]} maxStretch={1} />
          {index % 2 === 0 && (
            <mesh position={[-.21, -.15, 0]}>
              <boxGeometry args={[.02, .5, .08]} />
              <primitive object={materials.accent} attach="material" />
            </mesh>
          )}
        </group>
      ))}

      {/* Stadium tiers outside the wall */}
      {[0, 1, 2].map((tier) => {
        const inner = wallRadius + .5 + tier * 2.2;
        const height = 3.4 + (tier + 1) * 1.6;
        return (
          <group key={`tier-${tier}`}>
            <mesh position={[0, height - .8, 0]}>
              <cylinderGeometry args={[inner, inner, 1.6, 72, 1, true]} />
              <primitive object={materials.tier} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]}>
              <ringGeometry args={[inner, inner + 2.2, 72]} />
              <primitive object={materials.dark} attach="material" />
            </mesh>
          </group>
        );
      })}
      {towers.map((angle) => (
        <group key={angle} position={[Math.cos(angle) * (wallRadius + 7.5), 0, Math.sin(angle) * (wallRadius + 7.5)]} rotation={[0, -angle + Math.PI / 2, 0]}>
          <Prop
            name="light_tower"
            size={[6, 17, 6]}
            maxStretch={1}
            fallback={(
              <>
                <Bevelled size={[.6, 16, .6]} radius={.06} material={materials.dark} position={[0, 8, 0]} />
                <mesh position={[0, 16.3, 0]} rotation={[.5, 0, 0]}>
                  <boxGeometry args={[3.4, 1.4, .3]} />
                  <meshBasicMaterial color="#f3fbff" toneMapped={false} />
                </mesh>
              </>
            )}
            overlay={(
              <sprite position={[0, 16, 0]} scale={[5, 5, 1]}>
                <spriteMaterial map={getGlowTexture()} color="#f3fbff" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
              </sprite>
            )}
          />
        </group>
      ))}

      {level.obstacles.map((obstacle, index) => {
        if (obstacle.kind === 'crate') {
          const s = obstacle.halfX * 2;
          const procedural = (
            <group position={[0, obstacle.halfX, 0]}>
              <Bevelled size={[s, s, obstacle.halfZ * 2]} radius={.035} material={materials.crate} castShadow receiveShadow />
              <mesh rotation={[0, Math.PI / 4, 0]} position={[0, obstacle.halfX + .01, 0]}>
                <boxGeometry args={[obstacle.halfX * 2.4, .03, .05]} />
                <primitive object={materials.accent} attach="material" />
              </mesh>
            </group>
          );
          return (
            <group key={index} position={[obstacle.x, 0, obstacle.z]} rotation={[0, (index * 1.37) % .5 - .25, 0]}>
              {/* Mix three crate looks so cover doesn't read as copy-pasted. */}
              {index % 3 === 1 ? (
                <Prop name="barrel" size={[s * .85, s * 1.15, obstacle.halfZ * 2 * .85]} maxStretch={1} fallback={<Prop name="crate" size={[s, s, obstacle.halfZ * 2]} maxStretch={1.35} fallback={procedural} />} />
              ) : index % 3 === 2 ? (
                <Prop name="wood_crate" size={[s, s, obstacle.halfZ * 2]} maxStretch={1.1} fallback={<Prop name="crate" size={[s, s, obstacle.halfZ * 2]} maxStretch={1.35} fallback={procedural} />} />
              ) : (
                <Prop name="crate" size={[s, s, obstacle.halfZ * 2]} maxStretch={1.35} fallback={procedural} />
              )}
            </group>
          );
        }
        if (obstacle.kind === 'pillar') {
          const pillarRadius = Math.min(obstacle.halfX, obstacle.halfZ);
          return (
            <group key={index} position={[obstacle.x, 0, obstacle.z]}>
              <Prop
                name={index % 2 === 1 ? 'landmark_pillar' : 'pillar'}
                size={[pillarRadius * 2, 4.4, pillarRadius * 2]}
                maxStretch={index % 2 === 1 ? 1.8 : 1.4}
                fallback={(
                  <>
                    <Bevelled size={[pillarRadius * 2, 4.4, pillarRadius * 2]} radius={.06} material={materials.pillar} position={[0, 2.2, 0]} castShadow receiveShadow />
                    {[.9, 3.4].map((y) => (
                      <mesh key={y} position={[0, y, 0]}>
                        <boxGeometry args={[pillarRadius * 2.06, .06, pillarRadius * 2.06]} />
                        <primitive object={materials.accent} attach="material" />
                      </mesh>
                    ))}
                  </>
                )}
              />
            </group>
          );
        }
        const alongX = obstacle.halfX >= obstacle.halfZ;
        const length = (alongX ? obstacle.halfX : obstacle.halfZ) * 2;
        const depth = (alongX ? obstacle.halfZ : obstacle.halfX) * 2;
        const segments = Math.max(1, Math.round(length / 2.6));
        const segment = length / segments;
        return (
          <group key={index} position={[obstacle.x, 0, obstacle.z]}>
            {Array.from({ length: segments }, (_, i) => {
              const offset = (i - (segments - 1) / 2) * segment;
              return (
                <Prop
                  key={i}
                  name="barrier"
                  position={alongX ? [offset, 0, 0] : [0, 0, offset]}
                  size={alongX ? [segment * .98, 1.1, depth] : [depth, 1.1, segment * .98]}
                  fallback={i === 0 ? <BarrierProcedural obstacle={obstacle} materials={materials} /> : null}
                />
              );
            })}
          </group>
        );
      })}
      {level.hazards.map((hazard, index) => (
        <HazardMesh key={`${level.id}-hazard-${index}`} hazard={hazard} engineRef={engineRef} accent={level.theme.accent} />
      ))}
    </group>
  );
}

function BarrierProcedural({ obstacle, materials }: { obstacle: Obstacle; materials: ArenaMaterials }) {
  return (
    <>
      <Bevelled size={[obstacle.halfX * 2, 1.1, obstacle.halfZ * 2]} radius={.07} material={materials.barrier} position={[0, .55, 0]} castShadow receiveShadow />
      <Bevelled size={[obstacle.halfX * 1.9, .07, obstacle.halfZ * 1.8]} radius={.02} material={materials.trim} position={[0, 1.13, 0]} castShadow />
      <mesh position={[0, .16, 0]}>
        <boxGeometry args={[obstacle.halfX * 2.02, .03, obstacle.halfZ * 2.02]} />
        <primitive object={materials.accent} attach="material" />
      </mesh>
    </>
  );
}

// ── Lighting ────────────────────────────────────────────────────────────────

/** Drop a 1K–2K equirectangular .hdr here to light the arena with your own HDRI. */
const LOCAL_HDRI_URL = `${import.meta.env.BASE_URL}textures/arena_env.hdr`;

export function LevelLighting({ level, engineRef }: { level: LevelDef; engineRef: MutableRefObject<Engine> }) {
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const { theme } = level;
  useFrame(() => {
    // The shadow frustum follows the player so the big arenas keep crisp shadows.
    const light = keyRef.current;
    if (!light) return;
    const game = engineRef.current;
    light.position.set(game.playerX + 6, 16, game.playerZ + 8);
    light.target.position.set(game.playerX, 0, game.playerZ);
    light.target.updateMatrixWorld();
  });
  const environment = { background: false, environmentIntensity: .65 } as const;
  return (
    <>
      <color attach="background" args={[theme.sky]} />
      <fog attach="fog" args={[theme.fog, theme.fogNear, theme.fogFar]} />
      <hemisphereLight args={[theme.hemiSky, theme.hemiGround, .75]} />
      <ambientLight intensity={.22} color={theme.hemiSky} />
      <directionalLight
        ref={keyRef}
        castShadow
        intensity={1.5}
        color={theme.keyLight}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={50}
        shadow-bias={-.0003}
        shadow-normalBias={.02}
      />
      <directionalLight position={[-8, 7, -6]} intensity={.4} color={theme.rimLight} />
      <pointLight position={[0, 7, 0]} intensity={14} distance={level.radius * 2.2} color={theme.accentSoft} />
      {/* Prefer a local HDRI; fall back to the CDN preset; play on without either. */}
      <OptionalAsset
        fallback={(
          <OptionalAsset>
            <Environment preset="warehouse" resolution={256} {...environment} />
          </OptionalAsset>
        )}
      >
        <Environment files={LOCAL_HDRI_URL} resolution={512} {...environment} />
      </OptionalAsset>
    </>
  );
}

class OptionalAsset extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('Optional scene asset failed to load; continuing without it.', error);
  }
  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return <Suspense fallback={null}>{this.props.children}</Suspense>;
  }
}
