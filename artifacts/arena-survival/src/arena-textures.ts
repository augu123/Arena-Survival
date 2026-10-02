import * as THREE from 'three';

/**
 * Procedurally-painted PBR texture sets for the arena's brutalist concrete
 * surfaces and the wooden supply crates. Generated once on canvas and cached
 * as module singletons so every wall/floor/obstacle segment can reuse (and
 * independently tile) the same base maps without refetching or re-painting.
 *
 * These are the fallback look. Real photographed sets in public/textures/
 * replace them at runtime (see real-textures.ts).
 */

type TextureSet = {
  map: THREE.CanvasTexture;
  /** Kept for older callers; materials should prefer normalMap. */
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
};

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintConcreteBase(
  ctx: CanvasRenderingContext2D,
  size: number,
  baseColor: string,
  options: { panels?: number; jointColor?: string; noiseAlpha?: number; seed?: number } = {},
) {
  const { panels = 4, jointColor = 'rgba(4,8,11,.32)', noiseAlpha = .05, seed = 7 } = options;
  const rand = mulberry32(seed);
  const k = size / 512; // keep feature sizes constant when resolution changes

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // Fine speckled mottling — the "smooth but not perfectly flat" cast-concrete look.
  const speckles = Math.round(1400 * k * k);
  for (let i = 0; i < speckles; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = (rand() * 9 + 1.5) * k;
    const light = rand() > .5;
    ctx.fillStyle = `rgba(${light ? 255 : 0},${light ? 255 : 0},${light ? 255 : 0},${(rand() * noiseAlpha).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny pores/pits — the detail that sells concrete up close.
  const pores = Math.round(900 * k * k);
  for (let i = 0; i < pores; i += 1) {
    ctx.fillStyle = `rgba(0,0,0,${(.08 + rand() * noiseAlpha * 2).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, (rand() * 1.2 + .4) * k, 0, Math.PI * 2);
    ctx.fill();
  }

  // Broad soft cloud shading so large panels don't read as a flat fill.
  for (let i = 0; i < 7; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = size * (.25 + rand() * .3);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() > .5;
    gradient.addColorStop(0, `rgba(${dark ? 0 : 255},${dark ? 0 : 255},${dark ? 0 : 255},${dark ? .06 : .04})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hairline cracks wandering across some panels.
  ctx.strokeStyle = jointColor;
  ctx.lineWidth = Math.max(1, .8 * k);
  for (let i = 0; i < 6; i += 1) {
    let x = rand() * size;
    let y = rand() * size;
    let angle = rand() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segments = 8 + Math.floor(rand() * 10);
    for (let s = 0; s < segments; s += 1) {
      angle += (rand() - .5) * .9;
      x += Math.cos(angle) * 9 * k;
      y += Math.sin(angle) * 9 * k;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Formwork panel joints — the modular seams described in the brief.
  const step = size / panels;
  ctx.strokeStyle = jointColor;
  ctx.lineWidth = Math.max(1, size * .0035);
  for (let i = 1; i < panels; i += 1) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
  }

  // Tie-bolt holes at panel corners, like real poured-concrete formwork.
  ctx.fillStyle = 'rgba(3,6,8,.4)';
  for (let px = 0; px <= panels; px += 1) {
    for (let py = 0; py <= panels; py += 1) {
      const x = px * step;
      const y = py * step;
      [[-.16, -.16], [.16, .16], [-.16, .16], [.16, -.16]].forEach(([ox, oy]) => {
        if (rand() > .35) return;
        ctx.beginPath();
        ctx.arc(x + ox * step, y + oy * step, size * .0055, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  // Faint vertical streaking (weathering / rain-runoff staining).
  ctx.globalAlpha = .06;
  for (let i = 0; i < 14; i += 1) {
    const x = rand() * size;
    const width = (2 + rand() * 6) * k;
    const streak = ctx.createLinearGradient(0, 0, 0, size);
    streak.addColorStop(0, 'rgba(0,0,0,0)');
    streak.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = streak;
    ctx.fillRect(x, 0, width, size);
  }
  ctx.globalAlpha = 1;
}

function paintWoodBase(ctx: CanvasRenderingContext2D, size: number, seed = 3) {
  const rand = mulberry32(seed);
  ctx.fillStyle = '#8a6a48';
  ctx.fillRect(0, 0, size, size);

  const plankCount = 4;
  const plankHeight = size / plankCount;
  for (let plank = 0; plank < plankCount; plank += 1) {
    const y = plank * plankHeight;
    const tint = .92 + rand() * .16;
    ctx.fillStyle = `rgba(${Math.round(148 * tint)},${Math.round(112 * tint)},${Math.round(76 * tint)},1)`;
    ctx.fillRect(0, y, size, plankHeight);

    ctx.strokeStyle = 'rgba(70,46,26,.28)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 8; g += 1) {
      const gy = y + rand() * plankHeight;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x <= size; x += size / 12) {
        ctx.lineTo(x, gy + Math.sin(x * .04 + g) * 2.4);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(35,22,12,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();

    for (let k = 0; k < 2; k += 1) {
      const kx = rand() * size;
      const ky = y + plankHeight * .5 + (rand() - .5) * plankHeight * .4;
      const kr = 4 + rand() * 5;
      ctx.fillStyle = 'rgba(55,35,20,.4)';
      ctx.beginPath(); ctx.ellipse(kx, ky, kr, kr * .6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(35,22,12,.4)';
      ctx.beginPath(); ctx.ellipse(kx, ky, kr * 1.6, kr * .9, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  const bracket = size * .16;
  ctx.fillStyle = 'rgba(30,34,36,.85)';
  [[0, 0], [size - bracket, 0], [0, size - bracket], [size - bracket, size - bracket]].forEach(([x, y]) => {
    ctx.fillRect(x, y, bracket, size * .035);
    ctx.fillRect(x, y, size * .035, bracket);
  });
}

/**
 * Turns a painted height canvas into a tangent-space (OpenGL convention)
 * normal map with a wrapping Sobel filter, so seams, pits and cracks catch
 * light from the HDRI the same way the GLB models' baked normals do.
 */
function heightToNormal(source: HTMLCanvasElement, strength: number) {
  const size = source.width;
  const src = source.getContext('2d')!.getImageData(0, 0, size, size).data;
  const height = new Float32Array(size * size);
  for (let i = 0; i < size * size; i += 1) height[i] = src[i * 4] / 255;

  const out = makeCanvas(size);
  const ctx = out.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      // Canvas rows run downward while texture V runs upward, hence +dy.
      let nx = -dx * strength;
      let ny = dy * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const o = (y * size + x) * 4;
      image.data[o] = Math.round((nx * .5 + .5) * 255);
      image.data[o + 1] = Math.round((ny * .5 + .5) * 255);
      image.data[o + 2] = Math.round((nz * .5 + .5) * 255);
      image.data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return out;
}

function finalizeTexture(canvas: HTMLCanvasElement, colorManaged: boolean) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.colorSpace = colorManaged ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

let concreteCache: TextureSet | null = null;
let woodCache: TextureSet | null = null;

export function getConcreteTextures(): TextureSet {
  if (concreteCache) return concreteCache;
  const size = 1024;

  const diffuseCanvas = makeCanvas(size);
  paintConcreteBase(diffuseCanvas.getContext('2d')!, size, '#48525a', { panels: 4, noiseAlpha: .07, seed: 11 });

  // Height pass shares the diffuse seed so pits, cracks and seams line up.
  const bumpCanvas = makeCanvas(size);
  paintConcreteBase(bumpCanvas.getContext('2d')!, size, '#9aa4aa', {
    panels: 4, jointColor: 'rgba(0,0,0,.6)', noiseAlpha: .14, seed: 11,
  });

  const roughCanvas = makeCanvas(size);
  paintConcreteBase(roughCanvas.getContext('2d')!, size, '#cfd5d8', {
    panels: 4, jointColor: 'rgba(255,255,255,.1)', noiseAlpha: .1, seed: 11,
  });

  concreteCache = {
    map: finalizeTexture(diffuseCanvas, true),
    bumpMap: finalizeTexture(bumpCanvas, false),
    normalMap: finalizeTexture(heightToNormal(bumpCanvas, 3), false),
    roughnessMap: finalizeTexture(roughCanvas, false),
  };
  return concreteCache;
}

export function getWoodTextures(): TextureSet {
  if (woodCache) return woodCache;
  const size = 512;

  const diffuseCanvas = makeCanvas(size);
  paintWoodBase(diffuseCanvas.getContext('2d')!, size, 5);

  const bumpCanvas = makeCanvas(size);
  paintWoodBase(bumpCanvas.getContext('2d')!, size, 5);
  const bumpCtx = bumpCanvas.getContext('2d')!;
  bumpCtx.globalCompositeOperation = 'saturation';
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);
  bumpCtx.globalCompositeOperation = 'source-over';

  const roughCanvas = makeCanvas(size);
  paintWoodBase(roughCanvas.getContext('2d')!, size, 5);

  woodCache = {
    map: finalizeTexture(diffuseCanvas, true),
    bumpMap: finalizeTexture(bumpCanvas, false),
    normalMap: finalizeTexture(heightToNormal(bumpCanvas, 2), false),
    roughnessMap: finalizeTexture(roughCanvas, false),
  };
  return woodCache;
}

/** Clone a cached texture with its own independent repeat, so different arena
 * pieces (floor vs. wall vs. crate) can tile the same painted canvas at
 * different densities without stepping on each other's `repeat` settings. */
export function tiledTexture(texture: THREE.Texture, repeatX: number, repeatY: number) {
  const cloned = texture.clone();
  cloned.needsUpdate = true;
  cloned.repeat.set(repeatX, repeatY);
  return cloned;
}
