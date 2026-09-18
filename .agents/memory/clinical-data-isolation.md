---
name: Clinical data isolation
description: The privacy boundary for OptiScript's device-local clinical records.
---

OptiScript keeps an account-scoped cloud snapshot with a device-local cache for offline use. Storage keys, in-memory state, learned suggestions, and account-specific configuration must not be shared across signed-in users on the same device.

**Why:** Clinicians need the same patients, prescriptions, profile, and Rx pad configuration on multiple signed-in devices while preserving the existing shared-device privacy boundary.

**How to apply:** Scope local cache and server rows by authenticated Clerk user, clear provider state when there is no active user, serialize local writes, upload changes through the authenticated sync API, and reconcile newer remote snapshots when the app resumes.