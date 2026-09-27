import * as THREE from 'three';

/**
 * Optional real-photograph texture upgrades layered on top of the procedural
 * PBR maps in arena-textures.ts. Every load here is "best effort": if a URL
 * 404s or fails for any reason, the material simply keeps whatever texture
 * (procedural) is already assigned — nothing crashes, nothing looks broken,
 * it just doesn't get the extra realism bump.
 */

const loader = new THREE.TextureLoader();

function configure(texture: THREE.Texture, colorManaged: boolean, repeatX: number, repeatY: number) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
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

type PbrSlot = 'map' | 'bumpMap' | 'roughnessMap';

/** Loads {diffuse, bump, roughness} URLs and assigns whichever succeed onto
 * the given material, at its own repeat. Silent no-op for any that fail
 * (missing file, network hiccup, etc.) — the material's existing procedural
 * texture in that slot is left untouched. */
export async function upgradeMaterialTextures(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  urls: { diffuse?: string; bump?: string; roughness?: string },
  repeatX: number,
  repeatY: number,
) {
  const jobs: Array<Promise<void>> = [];
  const assign = (slot: PbrSlot, url: string | undefined, colorManaged: boolean) => {
    if (!url) return;
    jobs.push(
      tryLoad(url, colorManaged, repeatX, repeatY).then((texture) => {
        if (!texture) return;
        (material as any)[slot] = texture;
        material.needsUpdate = true;
      }),
    );
  };
  assign('map', urls.diffuse, true);
  assign('bumpMap', urls.bump, false);
  assign('roughnessMap', urls.roughness, false);
  await Promise.all(jobs);
}

/** A real photographed hardwood floor texture set bundled in three.js's own
 * MIT-licensed examples (pinned to a fixed commit so it never changes under
 * us). Verified to load with `access-control-allow-origin: *`, so it's safe
 * to sample as a WebGL texture from any origin. Used for the supply crates —
 * a genuine photographic upgrade over the procedurally-painted wood grain,
 * available immediately with no asset download needed. */
const THREE_JS_PINNED_COMMIT = '1af6de5bd8cd481993483dc6127eba668e818dfd';
const threeJsExampleTexture = (name: string) =>
  `https://raw.githubusercontent.com/mrdoob/three.js/${THREE_JS_PINNED_COMMIT}/examples/textures/${name}`;

export const REAL_WOOD_TEXTURE_URLS = {
  diffuse: threeJsExampleTexture('hardwood2_diffuse.jpg'),
  bump: threeJsExampleTexture('hardwood2_bump.jpg'),
  roughness: threeJsExampleTexture('hardwood2_roughness.jpg'),
};

/**
 * Optional real concrete photograph upgrade. Unlike the wood set above, this
 * repo doesn't bundle a verifiable CC0 concrete photo we could point at
 * directly — Poly Haven and ambientCG's real download links are generated
 * per-request rather than being stable, guessable URLs, so hard-coding one
 * here risked shipping a dead/fabricated link.
 *
 * Instead, this looks for local files under /textures/ (Vite's `public`
 * folder) and silently upgrades to them if present, or keeps the procedural
 * concrete texture if not. To get real photographic concrete: download a 1K
 * JPG set (Diffuse + Normal(GL) as bump + Rough) from a CC0 source such as
 * Poly Haven's "Cracked Concrete" (https://polyhaven.com/a/cracked_concrete)
 * or "Concrete Tiles" (https://polyhaven.com/a/concrete_tiles), and save them
 * into `artifacts/arena-survival/public/textures/` as exactly:
 *   concrete_diff_1k.jpg, concrete_nor_1k.jpg, concrete_rough_1k.jpg
 * No code changes needed after that — this loader picks them up automatically.
 */
const publicTextureUrl = (name: string) => `${import.meta.env.BASE_URL}textures/${name}`;

export const OPTIONAL_REAL_CONCRETE_TEXTURE_URLS = {
  diffuse: publicTextureUrl('concrete_diff_1k.jpg'),
  bump: publicTextureUrl('concrete_nor_1k.jpg'),
  roughness: publicTextureUrl('concrete_rough_1k.jpg'),
};
