import { normalizePrescriptionConfig } from "@/constants/prescriptionConfig";
import type { PrescriptionConfig } from "@/types";

export const PRESCRIPTION_CONFIG_STORAGE_KEY = "@optiscript_prescription_config";

export function getPrescriptionConfigStorageKey(userId: string): string {
  return `${PRESCRIPTION_CONFIG_STORAGE_KEY}:${userId}`;
}

export function isCurrentDataSession(
  activeUserId: string | null,
  expectedUserId: string | null,
): expectedUserId is string {
  return Boolean(expectedUserId) && activeUserId === expectedUserId;
}

export function getPrescriptionConfigForUser(
  storage: ReadonlyMap<string, string>,
  userId: string | null,
): PrescriptionConfig {
  return deserializePrescriptionConfig(
    userId ? storage.get(getPrescriptionConfigStorageKey(userId)) : undefined,
  );
}

export function serializePrescriptionConfig(config: PrescriptionConfig): string {
  return JSON.stringify(config);
}

export function deserializePrescriptionConfig(value: string | null | undefined): PrescriptionConfig {
  if (!value) return normalizePrescriptionConfig(undefined);
  return normalizePrescriptionConfig(JSON.parse(value));
}