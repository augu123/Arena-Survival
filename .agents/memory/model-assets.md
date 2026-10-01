---
name: Model assets and LFS
description: Why runtime GLBs live in attached_assets/models as plain, optimized files
---

Runtime GLBs must be regular git files in `attached_assets/models/`, not Git LFS objects, and should be decimated before use (gltf-transform `weld` + `simplify`, textures ≤1024px).

**Why:** The original Warden and car uploads were LFS-tracked. Checkouts and builds without LFS shipped 133-byte pointer files, so the loaders failed and the bosses fell back to stand-ins. The raw files were also 55–62 MB with about a million vertices, too heavy to load before the encounter starts.

**How to apply:** Keep the raw uploads as source, export the optimized copy into `attached_assets/models/` with a plain filename, and `useLoader.preload` it at module load. Never pass `fallback=` to the R3F `<Canvas>`: R3F v9 mounts it inside the canvas even when WebGL works, which ran the 2D fallback's game loop (double sim steps, cameraYaw forced to 0) alongside the 3D scene.
