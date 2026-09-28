---
name: Operator sheet as a 3D skin
description: Why the game character uses projected artwork over articulated geometry
---

Use the supplied operator character sheet as the visual source for an articulated, volumetric player model rather than substituting an unrelated generated 3D asset. Keep the no-WebGL 2D rendering path available.

**Why:** The supplied artwork is a 2D reference sheet, not a ready-made rigged mesh. A generated mesh would not reliably preserve the character's likeness or the game's movement and weapon animations. A flat billboard preserved the image but did not satisfy the user's request for a genuinely 3D player.

**How to apply:** When changing the WebGL player model, maintain depth and articulation, keep the front artwork projection and color-matched side/back surfaces, and leave the 2D fallback as a separate compatibility path.