/**
 * SHA-256 Hashing Utilities for Tamper-Proof Digital Product Passports
 * 
 * All passport data is hashed to ensure integrity verification.
 * Any modification to underlying data will produce a different hash,
 * immediately flagging tampering.
 */

import CryptoJS from 'crypto-js';

/**
 * Generate a SHA-256 hash of any data object
 */
export function sha256Hash(data: unknown): string {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data, Object.keys(data as object).sort());
  return CryptoJS.SHA256(serialized).toString(CryptoJS.enc.Hex);
}

/**
 * Hash all critical Master Product fields for the DPP
 */
export function hashProductData(product: {
  gtin: string;
  productName: string;
  brand: string;
  category: string;
  materials: unknown;
  compliance: unknown;
}): string {
  const critical = {
    gtin: product.gtin,
    productName: product.productName,
    brand: product.brand,
    category: product.category,
    materials: product.materials,
    compliance: product.compliance,
  };
  return sha256Hash(critical);
}

/**
 * Hash an Individual Life Cycle Record
 */
export function hashILCR(ilcr: {
  serialNumber: string;
  condition: string;
  lifecycleEvents: unknown[];
  currentOwner: string;
}): string {
  const critical = {
    serialNumber: ilcr.serialNumber,
    condition: ilcr.condition,
    lifecycleEvents: ilcr.lifecycleEvents,
    currentOwner: ilcr.currentOwner,
  };
  return sha256Hash(critical);
}

/**
 * Verify data integrity by comparing a stored hash with a freshly computed one
 */
export function verifyIntegrity(data: unknown, storedHash: string): boolean {
  const computedHash = sha256Hash(data);
  return computedHash === storedHash;
}

/**
 * Generate a combined passport hash (Master + ILCR)
 */
export function generatePassportHash(productHash: string, ilcrHash: string): string {
  return sha256Hash(`${productHash}:${ilcrHash}`);
}
