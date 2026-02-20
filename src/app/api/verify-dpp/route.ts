import { NextRequest, NextResponse } from 'next/server';
import { getDPPBySerial, recordScan } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const serial = req.nextUrl.searchParams.get('serial');
    if (!serial) {
        return NextResponse.json({ error: 'Missing serial number' }, { status: 400 });
    }

    const dpp = await getDPPBySerial(serial);
    if (!dpp) {
        return NextResponse.json({ error: 'DPP not found', verified: false }, { status: 404 });
    }

    // Record the scan
    const scanRecord = await recordScan({
        dpp_code_id: dpp.id,
        brand_id: dpp.brand_id,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
        verified: true,
        scanId: scanRecord?.id,
        serial_number: dpp.serial_number,
        status: dpp.status,
        scan_count: (dpp.scan_count || 0) + 1,
        product: dpp.product,
        brand: dpp.brand,
        passport_hash: dpp.passport_hash,
        created_at: dpp.created_at,
    });
}
