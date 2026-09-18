---
name: Data context testing
description: How to exercise the Expo data provider's account boundary in Node tests.
---

Mounted DataProvider tests need a React renderer plus lightweight mocks for Clerk, React Native, AsyncStorage, the API client, and bundled image assets.

**Why:** The provider's privacy boundary is enforced across React effects, local persistence, and delayed cloud work; source-text assertions cannot catch regressions in those interactions.

**How to apply:** Seed distinct scoped records, gate the next user's local load to observe the cleared boundary, and resolve the previous user's cloud promise only after the new user's state is active.