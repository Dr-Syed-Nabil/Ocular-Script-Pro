---
name: Rx pad overlay geometry
description: Physical sizing and coordinate-system rules for scanned Rx pad overlays
---

Overlay fields are physical millimeter geometry, not preview pixels. Apply the same paper-edge constraints before displaying, saving, and generating the PDF, and render the scan across the configured paper rectangle so the editor and printed placement share coordinates. A scan fit choice may change only the image transform; it must not change the field coordinate system.

Individual content boxes use the same absolute paper millimeter coordinate system as category fields. Missing child geometry means legacy whole-category rendering; do not synthesize child layouts during migration unless the clinician explicitly enables individual editing.

**Why:** A preview scale is only a display transform; letting persisted fields or the PDF use a different image aspect-ratio transform makes a carefully resized category print shifted or at the wrong apparent size.

**How to apply:** Keep geometry constraints in a shared pure helper and retain explicit `@page` and element dimensions in millimeters in the Rx Pad Overlay HTML. When adding image fitting options, normalize missing saved values to the original edge-to-edge behavior and apply the selected transform in both the editor preview and generated overlay HTML.