/**
 * You.com Search — Regulatory Watchdog Engine
 *
 * Industrial Logic: EU ESPR regulations change rapidly. Brands need real-time
 * monitoring of amendments that could affect their product lines. This module
 * uses the You.com Research endpoint for deep analysis of regulatory changes.
 *
 * API Sequence:
 *   1. GET → You.com Research endpoint with ESPR/textile query
 *   2. Parse and classify results by severity (critical/warning/info)
 *   3. Match against product categories to identify at-risk brands
 *   4. Return structured alert report
 *
 * Request Example:
 *   GET https://api.ydc-index.io/research?query=EU+ESPR+July+2026+textile+destruction+ban+update
 *   Headers: { "X-API-Key": "{key}" }
 */

const YOUSEARCH_API_KEY = process.env.YOUSEARCH_API_KEY || '';
const YOUSEARCH_API_URL = 'https://api.ydc-index.io';

// ─── Types ──────────────────────────────────
export interface RegulatoryUpdate {
    title: string;
    summary: string;
    source: string;
    url: string;
    severity: 'critical' | 'warning' | 'info';
    affectedCategories: string[];
    publishedDate: string;
    schemaImpact?: {
        type: 'add_requirement' | 'modify_requirement' | 'remove_requirement';
        targetSchema: string;
        fieldName: string;
        description: string;
    };
}

export interface RegulatoryScanReport {
    success: boolean;
    scannedAt: string;
    totalResults: number;
    updates: RegulatoryUpdate[];
    brandAlerts: {
        brandName: string;
        riskLevel: 'high' | 'medium' | 'low';
        affectedProducts: string[];
        action: string;
    }[];
    summary: string;
    error?: string;
}

// EU ESPR monitoring queries — rotated for comprehensive coverage
const MONITORING_QUERIES = [
    'EU ESPR Digital Product Passport regulation July 2026 update requirements',
    'EU textile destruction ban ESPR 2026 enforcement amendment',
    'European Commission sustainable products ecodesign regulation DPP mandate',
    'EU ESPR recycled content carbon footprint labeling requirements 2026',
];

// Category-specific alert keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Textiles & Apparel': ['textile', 'apparel', 'fashion', 'garment', 'clothing', 'fabric', 'cotton'],
    'Electronics': ['electronics', 'battery', 'devices', 'electrical', 'WEEE', 'RoHS'],
    'Batteries': ['battery', 'batteries', 'lithium', 'energy storage'],
    'Furniture': ['furniture', 'wood', 'upholstery'],
    'Packaging': ['packaging', 'plastic', 'single-use', 'recyclable'],
};

/**
 * Classify the severity of a regulatory update based on content analysis
 */
function classifySeverity(title: string, summary: string): 'critical' | 'warning' | 'info' {
    const text = `${title} ${summary}`.toLowerCase();

    // Critical: mandatory, ban, enforcement, deadline, penalty
    if (/mandatory|ban|enforce|deadline|penalty|fine|prohibition|non-compliance/.test(text)) {
        return 'critical';
    }

    // Warning: amendment, proposal, draft, upcoming, change
    if (/amendment|proposal|draft|upcoming|change|revision|update|new requirement/.test(text)) {
        return 'warning';
    }

    return 'info';
}

/**
 * Determine which product categories are affected by a regulatory update
 */
function detectAffectedCategories(text: string): string[] {
    const affected: string[] = [];
    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => lowerText.includes(kw))) {
            affected.push(category);
        }
    }

    // If no specific category detected, it may affect all
    if (affected.length === 0 && /all products|all categories|general|cross-sector/.test(lowerText)) {
        affected.push('All Categories');
    }

    return affected;
}

/**
 * Run the regulatory scout — scans You.com Research for EU ESPR updates.
 * Falls back to mock data if API key is not configured.
 */
export async function scanRegulations(): Promise<RegulatoryScanReport> {
    const scannedAt = new Date().toISOString();

    if (!YOUSEARCH_API_KEY) {
        console.warn('[You.com] No API key — returning mock regulatory report');
        return getMockReport(scannedAt);
    }

    try {
        // Rotate through monitoring queries
        const queryIndex = Math.floor(Date.now() / (1000 * 60 * 60)) % MONITORING_QUERIES.length;
        const query = MONITORING_QUERIES[queryIndex];

        // Use the Research endpoint for deeper analysis
        const response = await fetch(
            `${YOUSEARCH_API_URL}/research?query=${encodeURIComponent(query)}`,
            {
                method: 'GET',
                headers: {
                    'X-API-Key': YOUSEARCH_API_KEY,
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`You.com API error: ${response.status}`);
        }

        const data = await response.json();

        // Parse research results into structured regulatory updates
        const updates: RegulatoryUpdate[] = [];

        // Handle Research API response format
        const results = data.results || data.hits || data.search_results || [];

        for (const result of results.slice(0, 10)) {
            const title = result.title || result.name || '';
            const summary = result.description || result.snippet || result.text || '';
            const url = result.url || result.link || '';
            const source = result.source || new URL(url || 'https://unknown.com').hostname;

            if (!title && !summary) continue;

            const severity = classifySeverity(title, summary);
            const affectedCategories = detectAffectedCategories(`${title} ${summary}`);

            updates.push({
                title,
                summary: summary.slice(0, 500),
                source,
                url,
                severity,
                affectedCategories,
                publishedDate: result.published_date || result.date || scannedAt,
            });
        }

        // Generate brand alerts based on affected categories
        const brandAlerts = generateBrandAlerts(updates);

        return {
            success: true,
            scannedAt,
            totalResults: updates.length,
            updates,
            brandAlerts,
            summary: `Scanned ${updates.length} regulatory updates. ${updates.filter(u => u.severity === 'critical').length} critical, ${updates.filter(u => u.severity === 'warning').length} warnings.`,
        };
    } catch (error) {
        console.error('[You.com] Regulatory scan error:', error);
        return {
            success: false,
            scannedAt,
            totalResults: 0,
            updates: [],
            brandAlerts: [],
            summary: 'Regulatory scan failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Generate brand-specific alerts based on regulatory updates
 */
function generateBrandAlerts(updates: RegulatoryUpdate[]) {
    const alerts: RegulatoryScanReport['brandAlerts'] = [];

    const criticalTextileUpdates = updates.filter(
        u => u.severity === 'critical' && u.affectedCategories.some(c => c.includes('Textile'))
    );

    if (criticalTextileUpdates.length > 0) {
        alerts.push({
            brandName: 'All Textile Brands',
            riskLevel: 'high',
            affectedProducts: ['All textile and apparel products'],
            action: `Review ${criticalTextileUpdates.length} critical regulatory update(s) affecting textile products. Ensure end-of-life plans are documented for all unsold inventory.`,
        });
    }

    const generalUpdates = updates.filter(
        u => u.severity === 'critical' && u.affectedCategories.includes('All Categories')
    );

    if (generalUpdates.length > 0) {
        alerts.push({
            brandName: 'All Brands',
            riskLevel: 'medium',
            affectedProducts: ['All registered products'],
            action: `Review ${generalUpdates.length} general DPP regulation update(s) that may affect all product categories.`,
        });
    }

    return alerts;
}

/**
 * Mock report for development/demo purposes
 */
function getMockReport(scannedAt: string): RegulatoryScanReport {
    return {
        success: true,
        scannedAt,
        totalResults: 3,
        updates: [
            {
                title: 'EU Textile Destruction Ban Takes Effect July 19, 2026',
                summary: 'The European Commission has confirmed that the destruction of unsold textiles and footwear will be prohibited starting July 19, 2026 under the ESPR framework. Companies must document end-of-life plans for all unsold inventory.',
                source: 'European Commission',
                url: 'https://ec.europa.eu/espr/textile-ban-2026',
                severity: 'critical',
                affectedCategories: ['Textiles & Apparel'],
                publishedDate: '2026-02-15',
                schemaImpact: {
                    type: 'add_requirement',
                    targetSchema: 'masterProduct',
                    fieldName: 'destructionBanCompliance',
                    description: 'All unsold textiles must have documented end-of-life plan',
                },
            },
            {
                title: 'DPP QR Code Standards Published by GS1',
                summary: 'GS1 has finalized the technical standards for Digital Product Passport QR codes, requiring specific data encoding formats and minimum resolution requirements for EU compliance.',
                source: 'GS1 International',
                url: 'https://gs1.org/dpp-qr-standard-2026',
                severity: 'warning',
                affectedCategories: ['All Categories'],
                publishedDate: '2026-02-10',
            },
            {
                title: 'Carbon Footprint Labeling Guidance Updated',
                summary: 'The European Commission has updated guidance on carbon footprint calculation methodologies for Digital Product Passports, affecting how manufacturers report product-level emissions.',
                source: 'European Commission',
                url: 'https://ec.europa.eu/espr/carbon-guidance',
                severity: 'info',
                affectedCategories: ['Textiles & Apparel', 'Electronics'],
                publishedDate: '2026-02-08',
            },
        ],
        brandAlerts: [
            {
                brandName: 'All Textile Brands',
                riskLevel: 'high',
                affectedProducts: ['All textile and apparel products'],
                action: 'Review 1 critical regulatory update affecting textile products. Ensure end-of-life plans are documented for all unsold inventory.',
            },
        ],
        summary: 'Scanned 3 regulatory updates. 1 critical, 1 warning.',
    };
}
