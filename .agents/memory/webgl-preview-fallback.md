---
name: WebGL preview fallback
description: Replit preview browsers may not provide a usable WebGL context for Three.js.
---

For React Three Fiber scenes, test WebGL support before mounting `<Canvas>` and keep a working 2D fallback for context failures. Wrap optional `useLoader` models in local error boundaries with scene-compatible stand-ins; Suspense only handles pending loads, not rejected requests.

**Why:** In the Replit preview browser, `THREE.WebGLRenderer` failed during context creation, and R3F's `Canvas` fallback did not prevent an outer error screen. Separately, simulated failed GLB requests showed that an uncaught `useLoader` rejection can replace the whole app even though the procedural game scene can continue.

**How to apply:** Keep the Three.js scene as the primary experience, but choose a separate 2D or DOM fallback before mounting R3F when WebGL is unavailable. Give nonessential model loads a local error boundary and visible procedural fallback, then verify both successful and failed requests in the preview.