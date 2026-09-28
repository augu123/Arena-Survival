---
name: Three.js alpha masks
description: Why transparent canvas cutouts need a separate grayscale alphaMap in Three.js.
---

When a Three.js material uses `alphaMap`, encode opacity in the texture's green color channel. A transparent canvas with its original colored pixels is not a reliable alpha map: dark subject pixels become partly transparent, and the canvas alpha alone does not provide the intended silhouette.

**Why:** While adapting character-sheet art to a mesh, a transparent cutout had to be converted to an opaque black-and-white image, with the cutout's alpha copied into RGB, before assigning it as `alphaMap`.

**How to apply:** For future image-sheet cutouts, use the source image for `map` and a separate grayscale opacity texture for `alphaMap`, with UVs aligned to the same cropped region.