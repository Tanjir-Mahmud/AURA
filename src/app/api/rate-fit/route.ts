import { NextRequest, NextResponse } from 'next/server';
import { updateScanFitScore } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { scanId, fitScore } = await req.json();

        if (!scanId || typeof fitScore !== 'number') {
            return NextResponse.json({ error: 'Missing scanId or fitScore' }, { status: 400 });
        }

        // Clamp fitScore between 0 and 100
        const clampedScore = Math.min(100, Math.max(0, fitScore));

        await updateScanFitScore(scanId, clampedScore);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
