import { NextRequest, NextResponse } from 'next/server';
import { generateExecutiveReport } from '@/lib/intelligence/export_report';

export async function POST(req: NextRequest) {
    try {
        const { productId } = await req.json();

        if (!productId) {
            return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
        }

        const reportUrl = await generateExecutiveReport(productId);

        if (reportUrl) {
            return NextResponse.json({ success: true, reportUrl });
        } else {
            return NextResponse.json({ error: 'Report generation failed' }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
