---
name: Rx pad scan storage
description: Storage decision and scaling constraint for uploaded pre-printed prescription pad scans.
---

Uploaded Rx pad scans are currently compressed and stored as image data in the device-local prescription configuration so the overlay works offline and does not require a new backend or account-level file service.

**Why:** OptiScript’s current data model is local AsyncStorage, and the overlay must remain available on the same device after restart.

**How to apply:** Keep scan compression and validation in mind when extending the feature. If users need high-resolution scans, multi-device sync, or many saved pad templates, move image bytes to file/object storage and persist only a reference in the configuration.