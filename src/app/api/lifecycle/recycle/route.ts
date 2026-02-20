import { NextRequest, NextResponse } from 'next/server';
import { sanityWriteClient } from '@/lib/sanity';
import { generatePassport } from '@/agents/passportAgent';

/**
 * MISSION: CIRCULARITY TRIGGER
 * Automates the End-of-Life (EOL) transition for a product.
 */

export async function POST(req: NextRequest) {
    try {
        const { productId, ilcrId } = await req.json();

        if (!productId || !ilcrId) {
            return NextResponse.json({ error: 'Missing product or ILCR ID' }, { status: 400 });
        }

        if (!sanityWriteClient) {
            return NextResponse.json({ error: 'Sanity write client not configured' }, { status: 500 });
        }

        // 1. Update Sanity status to RECYCLED
        await sanityWriteClient
            .patch(productId)
            .set({ status: 'RECYCLED' })
            .commit();

        // 2. Trigger Foxit for End-of-Life Certificate
        // We'll fetch basic data and pass to passport agent
        const product = await sanityWriteClient.fetch(`*[_id == $productId][0]`, { productId });
        const ilcr = await sanityWriteClient.fetch(`*[_id == $ilcrId][0]`, { ilcrId });

        if (!product || !ilcr) {
            return NextResponse.json({ error: 'Data not found for certificate generation' }, { status: 404 });
        }

        const eolResult = await generatePassport(
            {
                ...product,
                productName: `End-of-Life Certificate: ${product.productName}`,
            },
            ilcr
        );

        return NextResponse.json({
            success: true,
            status: 'RECYCLED',
            certificateUrl: eolResult.pdfUrl,
            message: 'Product successfully transitioned to Circular Phase.'
        });

    } catch (error: any) {
        console.error('[Circularity] EOL Error:', error);
        return NextResponse.json({ error: 'Failed to trigger circularity loop', details: error.message }, { status: 500 });
    }
}
