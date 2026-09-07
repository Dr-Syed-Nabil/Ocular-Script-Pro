import { RxPadImageFit, RxPadOverlayField } from "@/types";

export const MIN_RX_PAD_PAPER_SIZE_MM = 20;
export const MIN_RX_PAD_FIELD_WIDTH_MM = 5;
export const MIN_RX_PAD_FIELD_HEIGHT_MM = 4;
export const DEFAULT_RX_PAD_IMAGE_FIT: RxPadImageFit = "fit";
export const DEFAULT_RX_PAD_IMAGE_POSITION = 50;

export function normalizeRxPadImageFit(value: unknown): RxPadImageFit {
  return value === "contain" || value === "crop" ? value : DEFAULT_RX_PAD_IMAGE_FIT;
}

export function getRxPadImageResizeMode(fit: RxPadImageFit): "stretch" | "contain" | "cover" {
  return fit === "contain" ? "contain" : fit === "crop" ? "cover" : "stretch";
}

export function normalizeRxPadImagePosition(value: unknown): number {
  const position = typeof value === "number" && Number.isFinite(value)
    ? value
    : DEFAULT_RX_PAD_IMAGE_POSITION;
  return Math.max(0, Math.min(100, position));
}

export function getRxPadImageBackgroundPosition(positionX: unknown, positionY: unknown): string {
  return `${normalizeRxPadImagePosition(positionX)}% ${normalizeRxPadImagePosition(positionY)}%`;
}

export interface RxPadImageRenderGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Calculate the image rectangle used by the editor preview for contain/crop.
 * Positioning uses the same percentage semantics as CSS background-position:
 * the available overflow is distributed from 0% (left/top) to 100% (right/bottom).
 */
export function getRxPadImageRenderGeometry(
  containerWidth: number,
  containerHeight: number,
  imageWidthPx: number,
  imageHeightPx: number,
  fit: RxPadImageFit,
  positionX: unknown,
  positionY: unknown,
): RxPadImageRenderGeometry | undefined {
  if (
    !Number.isFinite(containerWidth) || containerWidth <= 0
    || !Number.isFinite(containerHeight) || containerHeight <= 0
    || !Number.isFinite(imageWidthPx) || imageWidthPx <= 0
    || !Number.isFinite(imageHeightPx) || imageHeightPx <= 0
  ) {
    return undefined;
  }

  const normalizedFit = normalizeRxPadImageFit(fit);
  if (normalizedFit === "fit") {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight };
  }

  const scale = normalizedFit === "contain"
    ? Math.min(containerWidth / imageWidthPx, containerHeight / imageHeightPx)
    : Math.max(containerWidth / imageWidthPx, containerHeight / imageHeightPx);
  const width = imageWidthPx * scale;
  const height = imageHeightPx * scale;
  const x = normalizeRxPadImagePosition(positionX) / 100;
  const y = normalizeRxPadImagePosition(positionY) / 100;
  const left = (containerWidth - width) * x;
  const top = (containerHeight - height) * y;

  return {
    left: left === 0 ? 0 : left,
    top: top === 0 ? 0 : top,
    width,
    height,
  };
}

export interface RxPadOverlayContentOption {
  id: string;
  label: string;
}

export const RX_PAD_OVERLAY_CONTENT_OPTIONS: Record<string, RxPadOverlayContentOption[]> = {
  patient: [
    { id: "name", label: "Patient name" },
    { id: "age", label: "Age" },
    { id: "weight", label: "Weight" },
    { id: "phone", label: "Phone" },
    { id: "puid", label: "PUID" },
    { id: "date", label: "Date" },
  ],
  chiefComplaints: [{ id: "complaints", label: "Complaints" }],
  pastHistory: [
    { id: "conditions", label: "Medical conditions" },
    { id: "others", label: "Other history" },
    { id: "notes", label: "History notes" },
  ],
  visualAcuity: [
    { id: "ua", label: "Unaided (UA)" },
    { id: "wa", label: "With glasses (WA)" },
    { id: "ph", label: "Pinhole (PH)" },
    { id: "bcva", label: "Best corrected (BCVA)" },
  ],
  examination: [
    { id: "adnexa", label: "Adnexa" },
    { id: "anteriorSegment", label: "Anterior segment" },
    { id: "posteriorSegment", label: "Posterior segment" },
  ],
  gat: [
    { id: "right", label: "Right eye (RE)" },
    { id: "left", label: "Left eye (LE)" },
  ],
  diagnosis: [{ id: "diagnosis", label: "Diagnosis" }],
  drugs: [
    { id: "name", label: "Medicine name" },
    { id: "route", label: "Route" },
    { id: "schedule", label: "Dose and schedule" },
    { id: "duration", label: "Duration" },
    { id: "notes", label: "Notes" },
  ],
  spectacle: [
    { id: "distance", label: "Distance correction" },
    { id: "near", label: "Near correction" },
    { id: "ipd", label: "IPD" },
  ],
  lens: [
    { id: "usage", label: "Usage" },
    { id: "type", label: "Type" },
    { id: "coating", label: "Coating" },
    { id: "material", label: "Material" },
  ],
  investigations: [{ id: "investigations", label: "Investigations" }],
  advice: [
    { id: "english", label: "English advice" },
    { id: "bengali", label: "Bengali advice" },
  ],
  followUp: [
    { id: "english", label: "English follow-up" },
    { id: "bengali", label: "Bengali follow-up" },
  ],
};

export function getRxPadOverlayContentOptions(id: string): RxPadOverlayContentOption[] {
  return RX_PAD_OVERLAY_CONTENT_OPTIONS[id] || [];
}

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