---
name: Expo Metro image-size compatibility
description: Compatibility constraint between Expo SDK 54 Metro and the image-size package.
---

Metro 0.83's asset transformer expects the 1.x image-size API. A workspace-wide override to image-size 2.x can make Expo Web bundling fail at runtime because the newer decoder receives Metro's legacy input shape.

**Why:** A leftover dependency remediation override caused the mobile preview to return a 500 bundle response even though the application code was valid.

**How to apply:** Let Metro resolve its declared image-size 1.x range; do not add a global image-size major-version override.