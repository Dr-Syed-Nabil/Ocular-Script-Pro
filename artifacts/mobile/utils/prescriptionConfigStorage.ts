import { normalizePrescriptionConfig } from "@/constants/prescriptionConfig";
import type { PrescriptionConfig } from "@/types";

export const PRESCRIPTION_CONFIG_STORAGE_KEY = "@optiscript_prescription_config";

export function getPrescriptionConfigStorageKey(userId: string): string {
  return `${PRESCRIPTION_CONFIG_STORAGE_KEY}:${userId}`;
}

export function serializePrescriptionConfig(config: PrescriptionConfig): string {
  return JSON.stringify(config);
}

export function deserializePrescriptionConfig(value: string | null | undefined): PrescriptionConfig {
  if (!value) return normalizePrescriptionConfig(undefined);
  return normalizePrescriptionConfig(JSON.parse(value));
}