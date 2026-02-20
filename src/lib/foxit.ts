/**
 * Foxit PDF Services — DPP Legal Passport Generator
 *
 * Industrial Logic: When a product batch is finalized, Foxit generates a
 * "Legal Passport" PDF — a GS1-compliant document containing product data,
 * compliance metrics, SHA-256 integrity hash, dynamic QR code, and digital
 * signature for EU audit readiness.
 *
 * API Sequence:
 *   1. Collect product + ILCR + compliance data
 *   2. Generate SHA-256 passportHash
 *   3. Generate verification QR code
 *   4. POST → Foxit DocGen API with template + data
 *   5. Return signed PDF URL + hash
 *
 * Request Example:
 *   POST https://api.foxitcloud.com/docgen/v1/documents
 *   Headers: { client_id: "...", client_secret: "..." }
 *   Body: { template_name, output_format, data, options }
 *
 * Response Example:
 *   { url: "https://cdn.foxitcloud.com/docs/abc123.pdf", document_id: "abc123" }
 */

const FOXIT_CLIENT_ID = process.env.FOXIT_CLIENT_ID || '';
const FOXIT_CLIENT_SECRET = process.env.FOXIT_CLIENT_SECRET || '';
const FOXIT_API_URL = process.env.FOXIT_SERVER_URL || 'https://api.foxitcloud.com';

export interface FoxitPassportData {
    passportId: string;
    product: {
        gtin: string;
        name: string;
        brand: string;
        category?: string;
        description?: string;
    };
    materials: {
        composition: string;
        recycledContent: number;
        hazardousSubstances?: string[];
        weight?: number;
        originCountry: string;
    };
    compliance: {
        isCompliant: boolean;
        carbonFootprint: number;
        energyClass?: string;
        repairabilityScore: number;
        durabilityYears: number;
        recyclingInstructions?: string;
        certifications?: string[];
        complianceScore: number;
    };
    integrity: {
        algorithm: string;
        productHash: string;
        ilcrHash: string;
        passportHash: string;
    };
    qrCode?: {
        dataUrl: string;
        verificationUrl: string;
    };
    metadata: {
        generatedAt: string;
        expiresAt?: string;
        version: string;
        standard: string;
    };
}

export interface FoxitGenerationResult {
    success: boolean;
    pdfUrl: string | null;
    documentId: string | null;
    passportHash: string;
    error?: string;
}

/**
 * Generate a GS1-compliant DPP Legal Passport PDF via Foxit DocGen API.
 * Falls back to a mock result if Foxit API credentials are not configured.
 */
export async function generatePassportPDF(data: FoxitPassportData): Promise<FoxitGenerationResult> {
    if (!FOXIT_CLIENT_ID || !FOXIT_CLIENT_SECRET) {
        console.warn('[Foxit] No API credentials — returning mock result');
        return {
            success: true,
            pdfUrl: `https://mock.aura.app/passports/${data.passportId}.pdf`,
            documentId: `mock-${Date.now()}`,
            passportHash: data.integrity.passportHash,
        };
    }

    try {
        // Step 1: Authenticate with Foxit Cloud
        const authResponse = await fetch(`${FOXIT_API_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: FOXIT_CLIENT_ID,
                client_secret: FOXIT_CLIENT_SECRET,
                grant_type: 'client_credentials',
            }),
        });

        if (!authResponse.ok) {
            throw new Error(`Foxit auth failed: ${authResponse.status}`);
        }

        const { access_token } = await authResponse.json();

        // Step 2: Generate PDF with template + dynamic data
        const docGenResponse = await fetch(`${FOXIT_API_URL}/docgen/v1/documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
                'client_id': FOXIT_CLIENT_ID,
                'client_secret': FOXIT_CLIENT_SECRET,
            },
            body: JSON.stringify({
                template_name: 'dpp_gs1_compliant',
                output_format: 'pdf',
                data: {
                    // Product Identity
                    passportId: data.passportId,
                    productName: data.product.name,
                    productGtin: data.product.gtin,
                    brandName: data.product.brand,
                    category: data.product.category || 'General',
                    description: data.product.description || '',

                    // Materials & Origin
                    materialComposition: data.materials.composition,
                    recycledContentPercent: data.materials.recycledContent,
                    hazardousSubstances: data.materials.hazardousSubstances?.join(', ') || 'None declared',
                    countryOfOrigin: data.materials.originCountry,
                    weightKg: data.materials.weight || 'N/A',

                    // EU ESPR Compliance
                    complianceScore: data.compliance.complianceScore,
                    isCompliant: data.compliance.isCompliant,
                    carbonFootprintKgCO2e: data.compliance.carbonFootprint,
                    energyClass: data.compliance.energyClass || 'N/A',
                    repairabilityScore: data.compliance.repairabilityScore,
                    durabilityYears: data.compliance.durabilityYears,
                    recyclingInstructions: data.compliance.recyclingInstructions || '',
                    certifications: data.compliance.certifications?.join(', ') || 'None',

                    // Data Integrity
                    hashAlgorithm: data.integrity.algorithm,
                    productHash: data.integrity.productHash,
                    ilcrHash: data.integrity.ilcrHash,
                    passportHash: data.integrity.passportHash,

                    // QR Code
                    qrCodeImage: data.qrCode?.dataUrl || '',
                    verificationUrl: data.qrCode?.verificationUrl || '',

                    // Metadata
                    generatedAt: data.metadata.generatedAt,
                    expiresAt: data.metadata.expiresAt || 'No expiration',
                    standardVersion: data.metadata.version,
                    regulatory: data.metadata.standard,
                },
                options: {
                    encrypt: true,
                    sign: true,
                    watermark: false,
                    page_size: 'A4',
                },
            }),
        });

        if (!docGenResponse.ok) {
            const errorText = await docGenResponse.text();
            throw new Error(`Foxit DocGen failed (${docGenResponse.status}): ${errorText}`);
        }

        const result = await docGenResponse.json();

        return {
            success: true,
            pdfUrl: result.url || result.download_url || null,
            documentId: result.document_id || result.id || null,
            passportHash: data.integrity.passportHash,
        };
    } catch (error) {
        console.error('[Foxit] PDF generation error:', error);
        return {
            success: false,
            pdfUrl: null,
            documentId: null,
            passportHash: data.integrity.passportHash,
            error: error instanceof Error ? error.message : 'Foxit PDF generation failed',
        };
    }
}
