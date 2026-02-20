/**
 * QR Code Generation — Aura DPP System
 * 
 * Generates unique DPP QR codes for individual product items.
 * Each QR encodes a URL: {APP_URL}/verify/{serial_number}
 */

import QRCode from 'qrcode';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface QRGenerationResult {
    serialNumber: string;
    qrDataUrl: string;      // base64 PNG data URL
    verifyUrl: string;       // public verification URL
}

/** Generate a unique serial number for a DPP item */
export function generateSerialNumber(brandSlug: string, batchNumber: string, itemIndex: number): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const idx = String(itemIndex).padStart(4, '0');
    return `DPP-${brandSlug.toUpperCase().slice(0, 4)}-${batchNumber}-${idx}-${timestamp}`;
}

/** Generate a single QR code for one DPP item */
export async function generateDPPQRCode(serialNumber: string): Promise<QRGenerationResult> {
    const verifyUrl = `${APP_URL}/verify/${serialNumber}`;

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        type: 'image/png',
        width: 400,
        margin: 2,
        color: {
            dark: '#0a0a0a',
            light: '#ffffff',
        },
        errorCorrectionLevel: 'H', // High — allows logo overlay
    });

    return {
        serialNumber,
        qrDataUrl,
        verifyUrl,
    };
}

/** Generate QR codes for an entire batch */
export async function generateBatchQRCodes(
    brandSlug: string,
    batchNumber: string,
    quantity: number,
    onProgress?: (current: number, total: number) => void
): Promise<QRGenerationResult[]> {
    const results: QRGenerationResult[] = [];

    for (let i = 1; i <= quantity; i++) {
        const serialNumber = generateSerialNumber(brandSlug, batchNumber, i);
        const qr = await generateDPPQRCode(serialNumber);
        results.push(qr);

        if (onProgress) {
            onProgress(i, quantity);
        }
    }

    return results;
}
