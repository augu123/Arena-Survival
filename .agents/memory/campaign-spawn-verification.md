---
name: Campaign spawn verification
description: How to verify boss and miniboss visibility bugs in the actual campaign flow
---

Do not treat a manually inserted enemy or a direct render test as proof that a campaign visibility issue is fixed. A character can render correctly while normal play never reaches its wave, spawn point, or HUD state.

**Why:** Teowerine rendered when inserted directly, but that did not establish that first-level wave progression actually spawned it in play.

**How to apply:** Exercise the same level-flow and render path that campaign play uses, and verify both the enemy model and its HUD/radar state before declaring a visibility fix complete. If headless SwiftShader advances too slowly for several waves, accelerate the simulation through its normal wave logic and assert `toHud`/radar state, then separately confirm that the real WebGL scene mounts the model; simulation or successful asset requests alone do not prove visible rendering.

Headless SwiftShader may render too slowly for a real-time campaign run to reach later waves within a practical test window.

**Why:** A real first-arena simulation reached Teowerine and Warden quickly, but the headless browser did not advance far enough through the same waves to capture those live scenes.

**How to apply:** Keep deterministic campaign-flow checks and live model-render checks separate, and report clearly if only the former completed.