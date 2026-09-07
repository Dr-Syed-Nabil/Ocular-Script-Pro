---
name: Prescription command deck
description: The approved visual direction for the OptiScript prescriptions home.
---

The OptiScript prescriptions home should use a compact clinical command-deck hierarchy: dark navy branded hero, teal primary action, editorial greeting, live prescription/review counts, date-rail prescription cards, compact filter pills, inline review expansion, and a lightweight follow-up queue.

**Why:** This direction was explicitly selected as the production layout and gives the prescription list a clearer triage workflow without changing the clinical data model.

**How to apply:** Preserve the existing bottom tab routing and live DataContext behavior when extending this surface. New visual work should support search, review triage, quick expansion, and direct access to prescription detail.

The New Prescription flow should present its ten built-in categories as numbered accordion cards. Patient Particulars opens first; tapping another card reveals that category's existing fields without changing their state or save behavior. Custom sections use the same pattern with a plus marker.

**Why:** The form contains enough clinical fields that a single continuous scroll makes category navigation slow on mobile.

**How to apply:** Keep one active category at a time by default, retain the current section ordering, and do not move field logic into the card shell.