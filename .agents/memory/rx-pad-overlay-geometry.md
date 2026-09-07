---
name: Rx pad overlay geometry
description: Physical sizing and coordinate-system rules for scanned Rx pad overlays
---

Overlay fields are physical millimeter geometry, not preview pixels. Apply the same paper-edge constraints before displaying, saving, and generating the PDF, and render the scan across the configured paper rectangle so the editor and printed placement share coordinates.

**Why:** A preview scale is only a display transform; letting persisted fields or the PDF use a different image aspect-ratio transform makes a carefully resized category print shifted or at the wrong apparent size.

**How to apply:** Keep geometry constraints in a shared pure helper and retain explicit `@page` and element dimensions in millimeters in the Rx Pad Overlay HTML.