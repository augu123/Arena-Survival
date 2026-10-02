import * as THREE from 'three';

/**
 * Optional real-photograph PBR upgrades layered on top of the procedural maps
 * in arena-textures.ts. Every load is "best effort": a missing file or network
 * failure leaves the material's procedural texture in that slot untouched.
 *
 * Each slot accepts one URL or a list of candidates; the first one that loads
 * wins. That lets the new per-surface files (floor_*, wall_*, ...) take
 * priority while the older concrete_* file names keep working.
 */

const loader = new THREE.TextureLoader();

type UrlList = string | string[] | undefined;

export type PbrUrls = {
  diffuse?: string | string[];
  /** OpenGL-convention normal map (Poly Haven "nor_gl"). */
  normal?: string | string[];
  roughness?: string | string[];
  ao?: string | string[];
  /** Greyscale height used as a bump map when no normal map is available. */
  bump?: string | string[];
};

export type UpgradeOptions = {
  normalScale?: number;
  bumpScale?: number;
  aoIntensity?: number;
};

function configure(texture: THREE.Texture, colorManaged: boolean, repeatX: number, repeatY: number) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  texture.colorSpace = colorManaged ? THREE.SRGBColorSpace : THREE.NoColorSpace;
}

function tryLoad(url: string, colorManaged: boolean, repeatX: number, repeatY: number): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (texture) => { configure(texture, colorManaged, repeatX, repeatY); resolve(texture); },
      undefined,
      () => resolve(null),
    );
  });
}

async function tryLoadFirst(urls: UrlList, colorManaged: boolean, repeatX: number, repeatY: number) {
  const list = urls === undefined ? [] : Array.isArray(urls) ? urls : [urls];
  for (const url of list) {
    const texture = await tryLoad(url, colorManaged, repeatX, repeatY);
    if (texture) return texture;
  }
  return null;
}

/**
 * Loads whichever maps exist and assigns them to the material.
 * - A real normal map replaces the procedural relief entirely.
 * - A real photo with no normal map reuses the photo as its own bump map, so
 *   the relief lines up with what you see instead of fighting the procedural
 *   panel seams (which sit in different places).
 * Resolves to true if anything was upgraded.
 */
export async function upgradeMaterialTextures(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  urls: PbrUrls,
  repeatX: number,
  repeatY: number,
  options: UpgradeOptions = {},
) {
  const [diffuse, normal, roughness, ao, bump] = await Promise.all([
    tryLoadFirst(urls.diffuse, true, repeatX, repeatY),
    tryLoadFirst(urls.normal, false, repeatX, repeatY),
    tryLoadFirst(urls.roughness, false, repeatX, repeatY),
    tryLoadFirst(urls.ao, false, repeatX, repeatY),
    tryLoadFirst(urls.bump, false, repeatX, repeatY),
  ]);
  if (!diffuse && !normal && !roughness && !ao && !bump) return false;

  if (diffuse) material.map = diffuse;
  if (roughness) {
    material.roughnessMap = roughness;
    material.roughness = 1;
  }
  if (ao) {
    material.aoMap = ao;
    material.aoMapIntensity = options.aoIntensity ?? 1;
  }
  if (normal) {
    material.normalMap = normal;
    material.normalScale.setScalar(options.normalScale ?? 1);
    material.bumpMap = null;
  } else if (bump) {
    material.bumpMap = bump;
    material.bumpScale = options.bumpScale ?? 1;
    material.normalMap = null;
  } else if (diffuse) {
    material.bumpMap = diffuse;
    material.bumpScale = options.bumpScale ?? 1;
    material.normalMap = null;
  }
  material.needsUpdate = true;
  return true;
}

// ── Sources ─────────────────────────────────────────────────────────────────

/** Files you drop into artifacts/arena-survival/public/textures/. */
const local = (name: string) => `${import.meta.env.BASE_URL}textures/${name}`;

/** Poly Haven-style set: <prefix>_diff.jpg, _nor_gl.jpg, _rough.jpg, _ao.jpg */
function localSet(prefix: string): Required<Pick<PbrUrls, 'diffuse' | 'normal' | 'roughness' | 'ao'>> {
  return {
    diffuse: [local(`${prefix}_diff.jpg`)],
    normal: [local(`${prefix}_nor_gl.jpg`)],
    roughness: [local(`${prefix}_rough.jpg`)],
    ao: [local(`${prefix}_ao.jpg`)],
  };
}

/** Older single concrete set, kept as a fallback for the floor and walls. */
const LEGACY_CONCRETE = {
  diffuse: local('concrete_diff_1k.jpg'),
  normal: local('concrete_nor_1k.jpg'),
  roughness: local('concrete_rough_1k.jpg'),
};

/** three.js's own MIT-licensed photographed hardwood, pinned to a commit. */
const THREE_JS_PINNED_COMMIT = '1af6de5bd8cd481993483dc6127eba668e818dfd';
const threeJsExampleTexture = (name: string) =>
  `https://raw.githubusercontent.com/mrdoob/three.js/${THREE_JS_PINNED_COMMIT}/examples/textures/${name}`;

export const REAL_WOOD_TEXTURE_URLS: PbrUrls = {
  diffuse: threeJsExampleTexture('hardwood2_diffuse.jpg'),
  bump: threeJsExampleTexture('hardwood2_bump.jpg'),
  roughness: threeJsExampleTexture('hardwood2_roughness.jpg'),
};

/** Kept for any older imports; same files as ARENA_SURFACES.floor's fallback. */
export const OPTIONAL_REAL_CONCRETE_TEXTURE_URLS: PbrUrls = LEGACY_CONCRETE;

const floor = localSet('floor');
const wall = localSet('wall');
const crate = localSet('crate');

/** Per-surface sets, each falling back to older/bundled files where sensible. */
export const ARENA_SURFACES: Record<'floor' | 'wall' | 'metal' | 'crate', PbrUrls> = {
  floor: {
    diffuse: [...floor.diffuse, LEGACY_CONCRETE.diffuse],
    normal: [...floor.normal, LEGACY_CONCRETE.normal],
    roughness: [...floor.roughness, LEGACY_CONCRETE.roughness],
    ao: floor.ao,
  },
  wall: {
    diffuse: [...wall.diffuse, ...floor.diffuse, LEGACY_CONCRETE.diffuse],
    normal: [...wall.normal, ...floor.normal, LEGACY_CONCRETE.normal],
    roughness: [...wall.roughness, ...floor.roughness, LEGACY_CONCRETE.roughness],
    ao: [...wall.ao, ...floor.ao],
  },
  metal: localSet('metal'),
  crate: {
    diffuse: [...crate.diffuse, threeJsExampleTexture('hardwood2_diffuse.jpg')],
    normal: crate.normal,
    roughness: [...crate.roughness, threeJsExampleTexture('hardwood2_roughness.jpg')],
    ao: crate.ao,
    bump: threeJsExampleTexture('hardwood2_bump.jpg'),
  },
};
