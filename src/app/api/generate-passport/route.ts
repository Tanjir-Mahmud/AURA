/**
 * MISSION: DEVELOP AURA - Step 2.2
 * /api/generate-passport
 * 
 * Fetch data from Sanity (digitalPassport), send to Foxit PDF Gen, 
 * return a Signed PDF.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePassport } from '@/agents/passportAgent';
import { sanityClient } from '@/lib/sanity';

export async function POST(req: NextRequest) {
    try {
        const { productId, ilcrId } = await req.json();

        if (!productId || !ilcrId) {
            return NextResponse.json({ error: 'Missing productId or ilcrId' }, { status: 400 });
        }

        console.log(`[API Generate-Passport] Fetching data for product ${productId}...`);

        // 1. Fetch data from Sanity (digitalPassport)
        // We look for both the master product and its associated passport/lifecycle data
        const productData = await sanityClient.fetch(
            `*[_id == $pid][0] {
                productName,
                brand,
                gtin,
                "composition": material_composition,
                "factory": origin_factory,
                "carbon": carbon_footprint
            }`,
            { pid: productId }
        );

        if (!productData) {
            throw new Error('Product not found in Sanity');
        }

        // 2. Prepare passport payload for orchestrator
        const result = await generatePassport(
            {
                gtin: productData.gtin,
                productName: productData.productName,
                brand: productData.brand,
                materials: {
                    composition: JSON.stringify(productData.composition),
                    originCountry: productData.factory
                },
                compliance: {
                    carbonFootprint: productData.carbon
                }
            },
            {
                serialNumber: productId, // Using productId as serial for mission continuity
                condition: 'new'
            }
        );

        return NextResponse.json({
            success: result.success,
            pdfUrl: result.pdfUrl,
            passportId: result.passportId,
            hashes: result.hashes
        });
    } catch (error: any) {
        console.error('[API Generate-Passport] Error:', error);
        return NextResponse.json({
            error: error.message || 'Passport generation failed'
        }, { status: 500 });
    }
}
