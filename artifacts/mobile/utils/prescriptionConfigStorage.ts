import { normalizePrescriptionConfig } from "@/constants/prescriptionConfig";
import type { PrescriptionConfig } from "@/types";

export const PRESCRIPTION_CONFIG_STORAGE_KEY = "@optiscript_prescription_config";
// AsyncStorage has a small, platform-dependent storage budget. Keep this
// entry below the common Android limit so the offline configuration remains
// writable even when other app data is present.
export const MAX_PRESCRIPTION_CONFIG_BYTES = 4 * 1024 * 1024;

export class PrescriptionConfigStorageError extends Error {
  readonly code = "prescription_config_too_large";

  constructor(
    public readonly byteLength: number,
    public readonly maxBytes: number = MAX_PRESCRIPTION_CONFIG_BYTES,
  ) {
    super(
      `This Rx Pad scan is too large to save. Choose a smaller or more compressed image (the saved Rx Pad configuration must stay under ${Math.round(maxBytes / (1024 * 1024))} MB), then try Save again.`,
    );
    this.name = "PrescriptionConfigStorageError";
  }
}

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
  const serialized = JSON.stringify(config);
  const byteLength = utf8ByteLength(serialized);
  if (byteLength > MAX_PRESCRIPTION_CONFIG_BYTES) {
    throw new PrescriptionConfigStorageError(byteLength);
  }
  return serialized;
}

export function deserializePrescriptionConfig(value: string | null | undefined): PrescriptionConfig {
  if (!value) return normalizePrescriptionConfig(undefined);
  return normalizePrescriptionConfig(JSON.parse(value));
}

export function getPrescriptionConfigByteLength(config: PrescriptionConfig): number {
  return utf8ByteLength(JSON.stringify(config));
}

function utf8ByteLength(value: string): number {
  // encodeURIComponent emits one token for each UTF-8 byte and works in the
  // Expo runtime without depending on a platform-specific TextEncoder.
  return encodeURIComponent(value).replace(/%[0-9A-F]{2}|./g, "x").length;
}