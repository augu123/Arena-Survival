---
name: Optional scene assets
description: Avoiding loader crashes from missing assets behind SPA routing.
---

Do not use a Three.js binary loader to probe whether an optional public asset exists. Use known bundled assets or explicitly validate the response before handing it to a loader.

**Why:** This app's Vite SPA routing returns the HTML entry page with HTTP 200 for missing public asset paths. An HDR loader then reports a file-format error, and a React error boundary does not prevent the preview from recording the error.

**How to apply:** When adding optional environment maps or other binary scene assets, verify actual file content rather than trusting HTTP success. Prefer locally generated lighting when no environment-map asset has been supplied.