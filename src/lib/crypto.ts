import { createHmac } from 'crypto';

/**
 * AURA Anti-Counterfeiting Engine
 * Uses HMAC-SHA256 to sign product URLs.
 */

const QR_SECRET_SALT = process.env.QR_SECRET_SALT || 'aura-industrial-salt-2026';

/**
 * Generates a verification signature for a product ID
 */
export function generateQrSignature(productId: string): string {
    return createHmac('sha256', QR_SECRET_SALT)
        .update(productId)
        .digest('hex');
}

/**
 * Verifies if a signature matches the product ID
 */
export function verifyQrSignature(productId: string, signature: string): boolean {
    const expected = generateQrSignature(productId);
    return expected === signature;
}
