---
name: Rx pad scan storage
description: Storage decision and scaling constraint for uploaded pre-printed prescription pad scans.
---

The bundled Nabil A4 scan is shipped as a static app asset; user-uploaded Rx pad scans are compressed and stored as image data in the device-local prescription configuration so overlays work offline and do not require a new backend or account-level file service.

**Why:** OptiScript’s current data model is local AsyncStorage, and the overlay must remain available on the same device after restart.

**How to apply:** Keep scan compression and validation in mind when extending the feature. If users need high-resolution scans, multi-device sync, or many saved pad templates, move image bytes to file/object storage and persist only a reference in the configuration.

The overlay editor supports direct manipulation with one stable touch responder: press and hold a category box to move it, then drag the selected bottom-right handle to resize it. Both gestures update the same bounded millimeter coordinates used for printing. Each category can also print as a whole or use an explicit list of content details.

**Why:** Exact overlay alignment is faster to tune visually than by repeatedly editing numeric fields, especially on a touch device.

**How to apply:** Keep the numeric fields as the precise fallback, keep resize bounds inside the physical paper dimensions, preserve the saved `RxPadOverlayField` shape for print compatibility, and treat missing content-selection data as the legacy whole-category behavior.