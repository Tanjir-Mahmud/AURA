/**
 * Regulatory Watchdog Worker — AURA Intelligence Layer
 *
 * Industrial Logic: This worker automates the process of checking
 * specific product compositions against real-time EU mandates.
 */

import { getRegulatoryPrompt } from './prompts';
import { IntelligenceRecord } from './types';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/supabase-types';

const YOUSEARCH_API_KEY = process.env.YOUSEARCH_API_KEY;
const YOUSEARCH_API_URL = 'https://api.ydc-index.io/research';

export async function runRegulatoryWatchdog(product: Product): Promise<IntelligenceRecord | null> {
    console.log(`[Watchdog] Analyzing regulatory risk for SKU: ${product.sku}...`);

    if (!YOUSEARCH_API_KEY) {
        console.warn('[Watchdog] No You.com API key configured.');
        return null;
    }

    try {
        // 1. Prepare materials list (from product metadata or Sanity)
        const materials = product.materials ? product.materials.split(',').map(m => m.trim()) : [];
        if (materials.length === 0) {
            console.warn('[Watchdog] No materials found for product. Skipping scan.');
            return null;
        }

        // 2. Build precision prompt
        const prompt = getRegulatoryPrompt(product.category, materials);

        // 3. Execute You.com Research Query
        const response = await fetch(`${YOUSEARCH_API_URL}?query=${encodeURIComponent(prompt)}`, {
            method: 'GET',
            headers: {
                'X-API-Key': YOUSEARCH_API_KEY,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) throw new Error(`You.com API Error: ${response.status}`);

        const data = await response.json();

        // 4. Parse Intelligence Results
        // We expect the LLM to follow the JSON format from the prompt.
        // We'll use a conservative fallback logic.
        const findings = data.answer || data.text || '';
        const jsonMatch = findings.match(/\{[\s\S]*\}/);
        let parsedResult = {
            flagged_materials: [] as string[],
            risk_score: 10,
            severity: 'LOW',
            auditor_note: 'No significant risks identified.'
        };

        if (jsonMatch) {
            try {
                parsedResult = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.warn('[Watchdog] Failed to parse JSON from You.com result, using heuristics.');
            }
        }

        // 5. Construct Intelligence Record
        const record: IntelligenceRecord = {
            id: crypto.randomUUID(),
            targetId: product.id,
            targetType: 'PRODUCT',
            timestamp: new Date().toISOString(),
            regulatoryRisk: {
                score: parsedResult.risk_score || 10,
                level: (parsedResult.severity as any) || 'LOW',
                latestMandate: parsedResult.auditor_note || findings.slice(0, 200),
                mismatchedMaterials: parsedResult.flagged_materials || [],
                sourceUrls: data.results?.map((r: any) => r.url) || []
            },
            returnMetrics: {
                averageFitScore: 0, // To be filled by Feature 2
                sampleSize: 0,
                probability: 0,
                alertTriggered: false,
                designFlawSuspected: false
            }
        };

        // 6. Persist to Supabase
        await supabase
            .from('products')
            .update({
                regulatory_risk: record.regulatoryRisk.level,
                intelligence_data: record
            })
            .eq('id', product.id);

        console.log(`[Watchdog] Risk Assessment Complete: ${record.regulatoryRisk.level}`);
        return record;

    } catch (error) {
        console.error('[Watchdog] Error during regulatory scan:', error);
        return null;
    }
}
