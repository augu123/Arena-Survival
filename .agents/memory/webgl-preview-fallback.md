---
name: WebGL preview fallback
description: Replit preview browsers may not provide a usable WebGL context for Three.js.
---

For React Three Fiber scenes, test WebGL support before mounting `<Canvas>` and render a working fallback scene when no context is available.

**Why:** In the Replit preview browser, `THREE.WebGLRenderer` failed during context creation, and R3F's `Canvas` fallback did not prevent the surrounding React error boundary from replacing the app with an error screen.

**How to apply:** Keep the Three.js scene as the primary experience, but choose a separate 2D or DOM fallback before mounting R3F when WebGL is unavailable. Verify the fallback in the actual preview browser.