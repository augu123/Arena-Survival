import { Component, type ReactNode, Suspense, useMemo } from 'react';
import { useLoader, type ThreeElements } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as THREE from 'three';

/**
 * Arena props (crate, barrier, pillar, ...) generated in Tripo and compressed
 * with meshopt + WebP. They're discovered with a glob instead of static
 * imports, so a missing file never breaks the build: that prop just keeps
 * its procedural fallback. Add attached_assets/models/<name>.glb and it
 * shows up on the next reload.
 */

export type PropName =
  | 'crate' | 'barrier' | 'pillar' | 'buttress' | 'wall_panel' | 'floor_vent' | 'toxic_drain' | 'light_tower'
  // Second batch. Only barrel, wood_crate and landmark_pillar are placed so far;
  // the rest are in the repo ready for features that will use them.
  | 'barrel' | 'wood_crate' | 'landmark_pillar' | 'wall_arc' | 'stack_vent' | 'field_emitter' | 'arc_trap' | 'dome_segment' | 'floor_tile'
  // Third batch. hydraulic_platform, sliding_wall and rifle wait for gameplay that uses them.
  | 'scifi_cube' | 'pipe' | 'cable_tray' | 'warning_sign' | 'biohazard_marker' | 'ammo_box' | 'energy_cell' | 'hydraulic_platform' | 'sliding_wall' | 'rifle';

const MODEL_URLS = import.meta.glob('@assets/models/*.glb', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

function propUrl(name: PropName) {
  return Object.entries(MODEL_URLS).find(([path]) => path.endsWith(`/${name}.glb`))?.[1];
}

/** The props are meshopt-compressed; the loader needs the decoder registered. */
const withMeshopt = (loader: GLTFLoader) => { loader.setMeshoptDecoder(MeshoptDecoder); };

// Start downloading as soon as the game boots.
for (const name of ['crate', 'barrier', 'pillar', 'buttress', 'toxic_drain', 'light_tower', 'floor_vent', 'wall_panel', 'barrel', 'wood_crate', 'landmark_pillar', 'scifi_cube', 'pipe', 'cable_tray', 'warning_sign', 'biohazard_marker', 'ammo_box', 'energy_cell'] as PropName[]) {
  const url = propUrl(name);
  if (url) useLoader.preload(GLTFLoader, url, withMeshopt);
}

type GroupProps = Omit<ThreeElements['group'], 'children'>;

type FitProps = {
  /** Target box in metres (x, y, z) in the parent's axes. */
  size: [number, number, number];
  /**
   * How far a single axis may be stretched past the uniform "fit inside"
   * scale. 1 = keep proportions exactly; Infinity = fill the box exactly.
   */
  maxStretch?: number;
  /** Which part of the model sits on the origin: its base (default) or its top (for props sunk into the floor). */
  align?: 'bottom' | 'top';
  /** Turn off for big background pieces that only need to receive shadows. */
  castShadow?: boolean;
};

function FittedModel({ url, size, maxStretch = Infinity, align = 'bottom', castShadow = true, ...group }: FitProps & GroupProps & { url: string }) {
  const gltf = useLoader(GLTFLoader, url, withMeshopt);

  const bounds = useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    return { size: box.getSize(new THREE.Vector3()), center: box.getCenter(new THREE.Vector3()), minY: box.min.y, maxY: box.max.y };
  }, [gltf.scene]);

  // Clones share geometry, materials and textures with the cached original.
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = castShadow;
        object.receiveShadow = true;
      }
    });
    return clone;
  }, [gltf.scene, castShadow]);

  const fit = useMemo(() => {
    const [tx, ty, tz] = size;
    const { x: bx, y: by, z: bz } = bounds.size;
    // Turn the model 90° if its long horizontal side doesn't match the box's.
    const swap = Math.abs(tx - tz) > 1e-3 && Math.abs(bx - bz) > 1e-3 && (bx > bz) !== (tx > tz);
    const mx = swap ? bz : bx;
    const mz = swap ? bx : bz;
    const exact = [tx / Math.max(mx, 1e-4), ty / Math.max(by, 1e-4), tz / Math.max(mz, 1e-4)];
    const uniform = Math.min(...exact);
    const scale = exact.map((s) => Math.min(s, uniform * maxStretch)) as [number, number, number];
    return { swap, scale };
  }, [bounds, size, maxStretch]);

  return (
    <group {...group}>
      <group scale={fit.scale}>
        <group rotation={[0, fit.swap ? Math.PI / 2 : 0, 0]}>
          <primitive object={model} position={[-bounds.center.x, align === 'top' ? -bounds.maxY : -bounds.minY, -bounds.center.z]} />
        </group>
      </group>
    </group>
  );
}

class PropBoundary extends Component<{ name: string; fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn(`Prop "${this.props.name}" failed to load; using the procedural version.`, error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * A GLB prop sitting on the parent's origin (bottom-centre), fitted into
 * `size`. Shows `fallback` while loading, if the file is missing, or if it
 * fails to load.
 */
export function Prop({ name, fallback = null, overlay = null, ...props }: FitProps & GroupProps & {
  name: PropName;
  fallback?: ReactNode;
  /** Extra meshes shown only once the model is in (in the parent's space, not scaled). */
  overlay?: ReactNode;
}) {
  const url = propUrl(name);
  if (!url) return <>{fallback}</>;
  return (
    <PropBoundary name={name} fallback={fallback}>
      <Suspense fallback={fallback}>
        <FittedModel url={url} {...props} />
        {overlay}
      </Suspense>
    </PropBoundary>
  );
}

export function hasProp(name: PropName) {
  return propUrl(name) !== undefined;
}

/** Soft additive glow used for the flood-light heads (bloom picks it up). */
let glowTexture: THREE.CanvasTexture | null = null;
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.25, 'rgba(235,248,255,.75)');
  gradient.addColorStop(1, 'rgba(200,230,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}
