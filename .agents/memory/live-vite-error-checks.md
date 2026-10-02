---
name: Live Vite error checks
description: Diagnosing errors after artifact source reconciliation when static output and the active Vite workflow disagree.
---

After a publish, merge, or source reconciliation, do not treat a previous successful build or a static preview as proof that the current source parses. The dev workflow may reveal unresolved markers or transform errors only when it reloads the affected module.

**Why:** Static output can continue to serve a previously successful bundle while the current Vite source fails to transform.

**How to apply:** When a user reports errors after a source transition, inspect the active workflow logs and search the current source for conflict markers, then rebuild and restart the managed workflow.