import { RxPadOverlayField } from "@/types";

export const MIN_RX_PAD_PAPER_SIZE_MM = 20;
export const MIN_RX_PAD_FIELD_WIDTH_MM = 5;
export const MIN_RX_PAD_FIELD_HEIGHT_MM = 4;

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeRxPadPaperSize(value: number, fallback: number): number {
  return Math.max(
    MIN_RX_PAD_PAPER_SIZE_MM,
    finiteOr(value, fallback),
  );
}

function clampToRange(value: number, min: number, max: number): number {
  const safeMax = Math.max(min, max);
  return Math.max(min, Math.min(safeMax, finiteOr(value, min)));
}

/**
 * Keep a field fully inside the physical paper while preserving its requested
 * size whenever the paper has enough room for it.
 */
export function constrainRxPadOverlayField(
  field: RxPadOverlayField,
  paperWidthMm: number,
  paperHeightMm: number,
): RxPadOverlayField {
  const width = clampToRange(field.width, MIN_RX_PAD_FIELD_WIDTH_MM, paperWidthMm);
  const height = clampToRange(field.height, MIN_RX_PAD_FIELD_HEIGHT_MM, paperHeightMm);
  return {
    ...field,
    width,
    height,
    x: clampToRange(field.x, 0, paperWidthMm - width),
    y: clampToRange(field.y, 0, paperHeightMm - height),
  };
}

export function constrainRxPadOverlayFields(
  fields: RxPadOverlayField[],
  paperWidthMm: number,
  paperHeightMm: number,
): RxPadOverlayField[] {
  return fields.map((field) => constrainRxPadOverlayField(field, paperWidthMm, paperHeightMm));
}