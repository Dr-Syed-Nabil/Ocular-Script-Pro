---
name: Rx pad scan storage
description: Storage decision and scaling constraint for uploaded pre-printed prescription pad scans.
---

The bundled Nabil A4 scan is shipped as a static app asset; user-uploaded Rx pad scans are compressed in the prescription configuration, cached locally for offline printing, and included in the authenticated account sync snapshot for other devices.

**Why:** Clinicians expect their saved Rx pad templates and scan layouts to follow their signed-in account, while the overlay must remain available offline after a device restart.

**How to apply:** Keep scan compression and validation in mind when extending the feature. The current sync snapshot stores compressed image data in PostgreSQL; if users need higher-resolution scans or many templates, move image bytes to file/object storage and persist only a reference in the configuration.

The overlay editor supports direct manipulation with one stable touch responder: press and hold a category box to move it, then drag the selected bottom-right handle to resize it. Both gestures update the same bounded millimeter coordinates used for printing. Each category can also print as a whole or use an explicit list of content details.

**Why:** Exact overlay alignment is faster to tune visually than by repeatedly editing numeric fields, especially on a touch device.

**How to apply:** Keep the numeric fields as the precise fallback, keep resize bounds inside the physical paper dimensions, preserve the saved `RxPadOverlayField` shape for print compatibility, and treat missing content-selection data as the legacy whole-category behavior.