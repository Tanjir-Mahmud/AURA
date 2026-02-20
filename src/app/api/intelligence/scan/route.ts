import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';

export const dynamic = 'force-dynamic';

/**
 * MISSION: REGULATORY INTELLIGENCE AGENT
 * This API endpoint protects brands by cross-referencing Sanity product materials 
 * with the latest EU ESPR (Ecodesign for Sustainable Products Regulation) 2026 mandates.
 */

const YOUSEARCH_API_KEY = process.env.YOUSEARCH_API_KEY || '';
const YOUSEARCH_RESEARCH_URL = 'https://api.ydc-index.io/research';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
        return NextResponse.json({ error: 'Missing productId parameter' }, { status: 400 });
    }

    try {
        // 1. FETCH: Pull current product materials from Sanity
        const product = await sanityClient.fetch(
            `*[_id == $productId][0] {
                productName,
                materials,
                category
            }`,
            { productId }
        );

        if (!product) {
            return NextResponse.json({ error: 'Product not found in Sanity' }, { status: 404 });
        }

        const materialsList = product.materials || '';
        const category = product.category || 'Textiles';

        // 2. SEARCH: Use You.com 'Research' endpoint with precision prompt engineering
        // PROMPT TEMPLATE: Ensures verified legal updates, avoiding news gossip.
        const researchPrompt = `
            Identify current and upcoming EU ESPR (Ecodesign for Sustainable Products Regulation) textile regulations 
            specifically for February 2026 regarding these materials: [${materialsList}].
            
            Focus only on official European Commission announcements, delegated acts, or legal amendments.
            Exclude opinion pieces, news gossip, or non-verified blog posts.
            
            Return a JSON-like summary containing:
            1. Name of the regulation/amendment.
            2. Specific restriction or requirement for the materials listed.
            3. Enforcement date.
            4. Verified source URL.
        `.trim();

        if (!YOUSEARCH_API_KEY) {
            return NextResponse.json({
                productId,
                productName: product.productName,
                complianceStatus: 'WARNING: AGENT IN DEMO MODE',
                riskScore: 'MEDIUM',
                findings: ['You.com API Key is missing. Returning simulated regulatory alerts.'],
                alerts: [{
                    title: 'Upcoming ESPR 2026 Material Transparency Mandate',
                    severity: 'High',
                    note: 'All products containing synthetic blends must report microplastic shedding metrics.'
                }]
            });
        }

        const response = await fetch(`${YOUSEARCH_RESEARCH_URL}?query=${encodeURIComponent(researchPrompt)}`, {
            method: 'GET',
            headers: {
                'X-API-Key': YOUSEARCH_API_KEY,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`You.com API Error: ${response.status}`);
        }

        const data = await response.json();

        // 3. ANALYZE & SCORE: Generate Compliance Risk Score based on research
        // Simple logic: If keywords like 'ban', 'restricted', 'illegal' appear, risk increases.
        const resultsText = JSON.stringify(data).toLowerCase();
        let riskScore: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

        if (resultsText.includes('ban') || resultsText.includes('prohibit') || resultsText.includes('illegal')) {
            riskScore = 'HIGH';
        } else if (resultsText.includes('requirement') || resultsText.includes('report') || resultsText.includes('amendment')) {
            riskScore = 'MEDIUM';
        }

        // 4. RETURN: Structured data for the 'Insights' UI
        return NextResponse.json({
            productId,
            productName: product.productName,
            materials: materialsList,
            complianceRisk: riskScore,
            scannedAt: new Date().toISOString(),
            rawAnalysis: data.answer || data.text || 'No specific legal update found for this material configuration.',
            sourceUrls: data.source_urls || []
        });

    } catch (error: any) {
        console.error('[RegulatoryAgent] Error:', error);
        return NextResponse.json({ error: 'Failed to complete regulatory scan', details: error.message }, { status: 500 });
    }
}
