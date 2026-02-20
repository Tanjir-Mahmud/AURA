/**
 * Warehouse Agent — Voice-Activated Intake System
 *
 * Industrial Logic: Factory workers on loud floors use voice to log material data.
 * This agent converts audio → transcript → structured JSON → Sanity ILCR update.
 *
 * API Sequence:
 *   1. Audio buffer → Deepgram Nova-3 (REST or WebSocket)
 *   2. Transcript → parseWarehouseCommand() → structured WarehouseIntake
 *   3. WarehouseIntake → Sanity CMS ILCR lifecycle event
 *   4. Result returned to caller
 */

import { transcribeAudio, parseWarehouseCommand, type WarehouseIntake } from '@/lib/deepgram';
import { sanityWriteClient } from '@/lib/sanity';

// Agent metadata for the orchestrator
export const warehouseAgentDef = {
    id: 'warehouse-entry',
    name: 'Warehouse Entry Agent',
    capabilities: ['voice-entry', 'transcription', 'llm-parsing', 'supabase-update'],
    status: 'active' as const,
};

export interface WarehouseIntakeResult {
    success: boolean;
    intake: WarehouseIntake;
    sanityUpdateId: string | null;
    error?: string;
}

import { getServiceSupabase } from '@/lib/supabase';

/**
 * MISSION: DEVELOP AURA - Step 2.1
 * Process a voice audio recording, parse materials/weight into JSON via robust logic,
 * and update both Supabase (Product Status) and Sanity (Lifecycle).
 */
export async function processVoiceEntry(
    audioBuffer: ArrayBuffer,
    productId: string,
    operatorId: string = 'operator-1',
): Promise<{ success: boolean; parsedData: any; supabaseUpdate: any; sanityUpdate: any }> {
    console.log(`[WarehouseAgent] Processing voice-entry for product ${productId} by ${operatorId}`);

    // 1. Transcribe audio via Deepgram Nova-3
    const { transcript, confidence } = await transcribeAudio(audioBuffer);
    console.log(`[WarehouseAgent] Transcript: "${transcript}" (confidence: ${confidence})`);

    // 2. LLM-Style Parsing: Extract "Material: Organic Cotton, Weight: 200g" -> JSON
    // We simulate an LLM extraction here with advanced string/pattern matching
    const parsedData = parseMissionCommand(transcript);

    // 3. Update Supabase: Update product status
    let supabaseUpdate = { success: false, error: null as string | null };
    try {
        const sb = getServiceSupabase();
        // The mission implies we are moving forward in the lifecycle.
        // We'll update the status to 'RETAIL' if it's currently 'MANUFACTURING' or just update it based on notes.
        const { error: spErr } = await sb
            .from('products')
            .update({
                status: 'RETAIL', // Transitioning from Manufacturing to Retail after voice-entry entry
                updated_at: new Date().toISOString()
            })
            .eq('id', productId);

        if (spErr) throw spErr;
        supabaseUpdate.success = true;
        console.log(`[WarehouseAgent] Supabase updated for product: ${productId}`);
    } catch (err: any) {
        console.error('[WarehouseAgent] Supabase update fail:', err);
        supabaseUpdate.error = err.message;
    }

    // 4. Update Sanity: Add to digitalPassport (or lifecycle as before)
    // Here we align with the new 'digitalPassport' schema
    let sanityUpdate = { success: false, id: null as string | null };
    try {
        if (sanityWriteClient) {
            // Find the ILCR associated with this product
            const existingIlcr = await sanityWriteClient.fetch(
                `*[_type == "ilcr" && masterProduct._ref == $pid][0]._id`,
                { pid: productId }
            );

            const patch = {
                'material_composition': [
                    { _key: `mat-${Date.now()}`, material: parsedData.material, percentage: 100 }
                ],
                'origin_factory': 'Factory Alpha' // Mock source for now
            };

            if (existingIlcr) {
                const result = await sanityWriteClient.patch(existingIlcr).set(patch).commit();
                sanityUpdate.id = result._id;
                sanityUpdate.success = true;
            }
        }
    } catch (err) {
        console.error('[WarehouseAgent] Sanity update fail:', err);
    }

    return {
        success: true,
        parsedData,
        supabaseUpdate,
        sanityUpdate
    };
}

/**
 * Simulated LLM Parser for Step 2.1
 * Extracts material and weight from raw transcripts.
 */
function parseMissionCommand(transcript: string) {
    const lower = transcript.toLowerCase();

    // Extract Material
    const materialMatch = lower.match(/material:?\s*([\w\s]+?)(?:,|$|weight)/);
    const material = materialMatch ? materialMatch[1].trim() : "Unknown Material";

    // Extract Weight
    const weightMatch = lower.match(/weight:?\s*([\d\.]+(?:g|kg|lbs)?)/);
    const weight = weightMatch ? weightMatch[1].trim() : "Unknown Weight";

    return {
        material: material.charAt(0).toUpperCase() + material.slice(1),
        weight,
        rawTranscript: transcript,
        timestamp: new Date().toISOString()
    };
}

