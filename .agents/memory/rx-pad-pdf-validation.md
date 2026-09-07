---
name: Rx pad PDF validation
description: Renderer-independent validation rules for scanned Rx pad PDFs
---

PDF engines may flatten a CSS background image into vector paint instead of preserving a `/Subtype /Image` object. A fit regression check should therefore verify that the rendered PDF is non-empty, preserves the configured physical page dimensions, and uses a deliberately mismatched scan aspect ratio; it should not depend on a particular internal PDF object representation.

**Why:** The same overlay HTML can be serialized differently by Chromium, native WebViews, and desktop/mobile PDF viewers even when the visible scan is correct.

**How to apply:** Keep the fit-mode HTML assertions alongside a real rendered-PDF check. Measure the PDF page box in points converted from the configured millimeter dimensions, and use a real JPEG scan fixture rather than an SVG-only fixture when testing image embedding.