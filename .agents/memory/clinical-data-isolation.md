---
name: Clinical data isolation
description: The privacy boundary for OptiScript's device-local clinical records.
---

OptiScript keeps clinical records locally for offline use, but those records are still account-owned data. Storage keys, in-memory state, learned suggestions, and account-specific configuration must not be shared across signed-in users on the same device.

**Why:** A shared-device sign-out/sign-in flow can otherwise expose one clinician's patients and prescriptions to another clinician, even when Clerk authentication itself is correct.

**How to apply:** Scope persisted clinical data by the authenticated Clerk user, clear provider state when there is no active user, and serialize writes so logout or account switching cannot expose stale in-memory records.