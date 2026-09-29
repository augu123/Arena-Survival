---
name: Operator character asset
description: Why the WebGL player uses the supplied GLB rather than projected 2D artwork
---

Use the user-supplied GLB as the main WebGL character. The original character sheet remains appropriate for the separate no-WebGL 2D fallback, not the main 3D model.

**Why:** The user found the projected-artwork body messy and explicitly supplied a textured 3D model to replace it. That model is a static single mesh without a skeleton or animations, so full limb movement requires a separate rigging step.

**How to apply:** Preserve the supplied GLB's geometry and PBR materials when updating the main player. Do not reinstate the former projected-hemisphere model; if articulated motion is requested, rig or replace the static mesh deliberately.