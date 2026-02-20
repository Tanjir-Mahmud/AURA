import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, createBatch, updateBatchStatus, insertDPPCodes } from '@/lib/supabase';
import { generateBatchQRCodes } from '@/lib/qr';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        // Auth: verify the caller owns this brand
        const authUserId = req.headers.get('x-auth-user-id');
        if (!authUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { brand_id, product_id, batch_number, quantity } = body;

        if (!brand_id || !product_id || !batch_number || !quantity) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify the authenticated user belongs to this brand
        const db = getServiceSupabase();
        const { data: membership } = await db
            .from('brand_users')
            .select('id')
            .eq('auth_user_id', authUserId)
            .eq('brand_id', brand_id)
            .single();

        if (!membership) {
            return NextResponse.json({ error: 'Forbidden — you do not own this brand' }, { status: 403 });
        }

        if (quantity < 1 || quantity > 10000) {
            return NextResponse.json({ error: 'Quantity must be 1–10,000' }, { status: 400 });
        }

        // 1. Fetch brand slug for serial number generation
        const { data: brand } = await db.from('brands').select('slug').eq('id', brand_id).single();
        if (!brand) {
            return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
        }

        // 2. Create production batch
        const batch = await createBatch({
            brand_id,
            product_id,
            batch_number,
            quantity,
            status: 'generating',
        });

        if (!batch) {
            return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
        }

        // 3. Generate QR codes
        const qrResults = await generateBatchQRCodes(
            brand.slug,
            batch_number,
            quantity,
        );

        // 4. Insert DPP codes into database
        const dppCodes = qrResults.map(qr => ({
            batch_id: batch.id,
            brand_id,
            product_id,
            serial_number: qr.serialNumber,
            qr_data: qr.qrDataUrl,
            passport_hash: crypto.createHash('sha256')
                .update(`${qr.serialNumber}:${product_id}:${brand_id}:${Date.now()}`)
                .digest('hex'),
            status: 'active' as const,
        }));

        const inserted = await insertDPPCodes(dppCodes);

        // 5. Update batch status
        await updateBatchStatus(batch.id, 'completed', inserted.length);

        return NextResponse.json({
            success: true,
            batch_id: batch.id,
            batch_number,
            quantity,
            generated: inserted.length,
            codes: inserted.slice(0, 20).map(c => ({
                serial_number: c.serial_number,
                qr_data: c.qr_data,
            })),
        });
    } catch (error) {
        console.error('[API] Generate DPP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
