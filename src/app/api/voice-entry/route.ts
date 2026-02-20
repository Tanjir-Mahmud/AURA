/**
 * MISSION: DEVELOP AURA - Step 2.1
 * /api/voice-entry
 * 
 * Takes audio from Deepgram, uses an LLM-powered agent to parse
 * "Material: Organic Cotton, Weight: 200g" into JSON, 
 * and updates Supabase product status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processVoiceEntry } from '@/agents/warehouseAgent';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File;
        const productId = formData.get('productId') as string;
        const operatorId = formData.get('operatorId') as string;

        if (!audioFile || !productId) {
            return NextResponse.json({ error: 'Missing audio or productId' }, { status: 400 });
        }

        console.log(`[API Voice-Entry] Processing audio for product: ${productId}`);

        // Convert File to ArrayBuffer for processing
        const arrayBuffer = await audioFile.arrayBuffer();

        // Process via Warehouse Agent (Deepgram + LLM Parser)
        const result = await processVoiceEntry(arrayBuffer, productId, operatorId);

        return NextResponse.json({
            success: true,
            data: result.parsedData,
            supabaseUpdate: result.supabaseUpdate,
            sanityUpdate: result.sanityUpdate,
        });
    } catch (error: any) {
        console.error('[API Voice-Entry] Error:', error);
        return NextResponse.json({
            error: error.message || 'Voice entry processing failed'
        }, { status: 500 });
    }
}
