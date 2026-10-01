---
name: Campaign spawn verification
description: How to verify boss and miniboss visibility bugs in the actual campaign flow
---

Do not treat a manually inserted enemy or a direct render test as proof that a campaign visibility issue is fixed. A character can render correctly while normal play never reaches its wave, spawn point, or HUD state.

**Why:** Teowerine rendered when inserted directly, but that did not establish that first-level wave progression actually spawned it in play.

**How to apply:** Exercise the same level-flow and render path that campaign play uses, and verify both the enemy model and its HUD/radar state before declaring a visibility fix complete.