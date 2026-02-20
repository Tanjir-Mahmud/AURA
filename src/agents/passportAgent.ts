/**
 * Passport Agent — GS1-Compliant DPP Generator
 *
 * Industrial Logic: When a product batch is finalized, this agent orchestrates
 * the generation of a "Legal Passport" PDF — a tamper-proof document with:
 * - Product data, materials, and compliance metrics
 * - SHA-256 integrity hashes (product, ILCR, and combined passport hash)
 * - Dynamic QR code linking to the verification URL
 * - Digital signature for EU audit readiness
 *
 * API Sequence:
 *   1. Receive product + ILCR data
 *   2. Calculate SHA-256 hashes via hashModule
 *   3. Generate verification QR code
 *   4. Send to Foxit DocGen API for PDF generation
 *   5. Return signed PDF URL + passport hash
 */

import { generatePassportPDF, type FoxitPassportData } from '@/lib/foxit';
import { hashProductData, hashILCR, generatePassportHash } from '@/lib/hash';
import { generateDPPQRCode } from '@/lib/qr';

// Agent metadata for the orchestrator
export const passportAgentDef = {
    id: 'passport-generator',
    name: 'Passport Generator Agent',
    capabilities: ['pdf-generation', 'qr-generation', 'hash-verification'],
    status: 'active' as const,
};

interface PassportProduct {
    gtin?: string;
    productName: string;
    brand: string;
    category?: string;
    description?: string;
    materials?: {
        composition?: string;
        recycledContent?: number;
        hazardousSubstances?: string[];
        weight?: number;
        originCountry?: string;
    };
    compliance?: {
        isCompliant?: boolean;
        carbonFootprint?: number;
        energyClass?: string;
        repairabilityScore?: number;
        durabilityYears?: number;
        recyclingInstructions?: string;
        certifications?: string[];
        complianceScore?: number;
    };
}

interface PassportILCR {
    serialNumber: string;
    condition?: string;
    currentOwner?: string;
    lifecycleEvents?: Array<{
        eventType: string;
        timestamp: string;
        actor?: string;
        description?: string;
    }>;
}

export interface PassportGenerationResult {
    success: boolean;
    passportId: string;
    pdfUrl: string | null;
    qrCodeDataUrl: string;
    verificationUrl: string;
    hashes: {
        productHash: string;
        ilcrHash: string;
        passportHash: string;
    };
    error?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Generate a complete Digital Product Passport
 */
export async function generatePassport(
    product: PassportProduct,
    ilcr: PassportILCR,
): Promise<PassportGenerationResult> {
    const passportId = `DPP-${product.gtin || 'UNKNOWN'}-${ilcr.serialNumber}`;
    console.log(`[PassportAgent] Generating passport: ${passportId}`);

    try {
        // 1. Calculate integrity hashes
        const productHash = hashProductData({
            gtin: product.gtin || '',
            productName: product.productName,
            brand: product.brand,
            materials: product.materials?.composition || '',
            category: product.category || '',
            compliance: product.compliance || {},
        });

        const ilcrHash = hashILCR({
            serialNumber: ilcr.serialNumber,
            condition: ilcr.condition || 'new',
            lifecycleEvents: ilcr.lifecycleEvents || [],
            currentOwner: ilcr.currentOwner || 'unknown',
        });

        const passportHash = generatePassportHash(productHash, ilcrHash);

        console.log(`[PassportAgent] Hashes — Product: ${productHash.slice(0, 12)}... | ILCR: ${ilcrHash.slice(0, 12)}... | Passport: ${passportHash.slice(0, 12)}...`);

        // 2. Generate verification QR code
        const verificationUrl = `${APP_URL}/verify/${ilcr.serialNumber}`;
        const qrResult = await generateDPPQRCode(verificationUrl);

        console.log(`[PassportAgent] QR code generated for ${verificationUrl}`);

        // 3. Generate PDF via Foxit
        const foxitData: FoxitPassportData = {
            passportId,
            product: {
                gtin: product.gtin || 'N/A',
                name: product.productName,
                brand: product.brand,
                category: product.category,
                description: product.description,
            },
            materials: {
                composition: product.materials?.composition || 'Not specified',
                recycledContent: product.materials?.recycledContent || 0,
                hazardousSubstances: product.materials?.hazardousSubstances,
                weight: product.materials?.weight,
                originCountry: product.materials?.originCountry || 'Unknown',
            },
            compliance: {
                isCompliant: product.compliance?.isCompliant || false,
                carbonFootprint: product.compliance?.carbonFootprint || 0,
                energyClass: product.compliance?.energyClass,
                repairabilityScore: product.compliance?.repairabilityScore || 0,
                durabilityYears: product.compliance?.durabilityYears || 0,
                recyclingInstructions: product.compliance?.recyclingInstructions,
                certifications: product.compliance?.certifications,
                complianceScore: product.compliance?.complianceScore || 0,
            },
            integrity: {
                algorithm: 'SHA-256',
                productHash,
                ilcrHash,
                passportHash,
            },
            qrCode: {
                dataUrl: qrResult.qrDataUrl,
                verificationUrl,
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                version: '1.0',
                standard: 'EU ESPR 2024/0xxx — Digital Product Passport',
            },
        };

        const pdfResult = await generatePassportPDF(foxitData);

        console.log(`[PassportAgent] PDF generated: ${pdfResult.success ? pdfResult.pdfUrl : 'FAILED'}`);

        return {
            success: pdfResult.success,
            passportId,
            pdfUrl: pdfResult.pdfUrl,
            qrCodeDataUrl: qrResult.qrDataUrl,
            verificationUrl,
            hashes: {
                productHash,
                ilcrHash,
                passportHash,
            },
            error: pdfResult.error,
        };
    } catch (error) {
        console.error('[PassportAgent] Generation failed:', error);
        return {
            success: false,
            passportId,
            pdfUrl: null,
            qrCodeDataUrl: '',
            verificationUrl: `${APP_URL}/verify/${ilcr.serialNumber}`,
            hashes: {
                productHash: '',
                ilcrHash: '',
                passportHash: '',
            },
            error: error instanceof Error ? error.message : 'Passport generation failed',
        };
    }
}
