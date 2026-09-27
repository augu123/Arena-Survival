---
name: Workspace dependency reconciliation
description: Package installation behavior when an artifact declares a dependency that is missing locally.
---

When a dependency is already declared by a pnpm workspace artifact but is missing from its installed modules or lockfile, reconcile the artifact package rather than adding that dependency to the workspace root.

**Why:** The generic language-package installer runs an unscoped root-level add, which pnpm rejects in this workspace. An artifact-scoped install restored the declared dependencies without changing the root package manifest.

**How to apply:** Check whether the artifact already declares the dependency. If it does, use a filter-scoped pnpm install for that artifact, then type-check and restart its managed workflow. Do not use this to bypass package-security blocks.