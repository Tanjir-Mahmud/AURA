import { NextRequest, NextResponse } from 'next/server';
import { orchestrateIntelligence } from '@/lib/intelligence/orchestrator';

export async function POST(req: NextRequest) {
    try {
        const { productId } = await req.json();

        if (!productId) {
            return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
        }

        const result = await orchestrateIntelligence(productId);

        if (result) {
            return NextResponse.json({ success: true, data: result });
        } else {
            return NextResponse.json({ error: 'Intelligence analysis failed' }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
