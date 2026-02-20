/**
 * Intelligence Orchestrator — AURA Intelligence Layer
 *
 * Industrial Logic: Coordinates all intelligence features (You.com, Perfect Corp)
 * and updates the product's intelligence state in Supabase.
 */

import { IntelligenceRecord } from './types';
import { runRegulatoryWatchdog } from './watchdog';
import { runFitAnalytics } from './fit_analytics';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/supabase-types';

export async function orchestrateIntelligence(productId: string): Promise<IntelligenceRecord | null> {
    console.log(`[Orchestrator] Running full intelligence suite for product: ${productId}`);

    try {
        // 1. Fetch the product from Supabase
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error || !product) throw new Error('Product not found');

        // 2. Run Regulatory Watchdog (You.com)
        const watchdogResult = await runRegulatoryWatchdog(product as Product);

        // 3. Run Fit Analytics (Perfect Corp)
        const fitResult = await runFitAnalytics(productId);

        // 4. Aggregate findings
        const finalRecord: IntelligenceRecord = {
            id: watchdogResult?.id || crypto.randomUUID(),
            targetId: productId,
            targetType: 'PRODUCT',
            timestamp: new Date().toISOString(),
            regulatoryRisk: watchdogResult?.regulatoryRisk || {
                score: 0,
                level: 'LOW',
                latestMandate: 'Scan pending.',
                mismatchedMaterials: [],
                sourceUrls: []
            },
            returnMetrics: {
                averageFitScore: fitResult?.averageFitScore ?? 0,
                sampleSize: fitResult?.sampleSize ?? 0,
                probability: fitResult?.probability ?? 0,
                alertTriggered: !!fitResult?.alertTriggered,
                designFlawSuspected: !!fitResult?.designFlawSuspected
            }
        };

        // 5. Update Supabase with the unified record
        await supabase
            .from('products')
            .update({
                regulatory_risk: finalRecord.regulatoryRisk.level,
                intelligence_data: finalRecord,
                compliance_score: Math.max(0, 100 - finalRecord.regulatoryRisk.score)
            })
            .eq('id', productId);

        console.log(`[Orchestrator] Success: Intelligence data synchronized for ${product.sku}`);
        return finalRecord;

    } catch (error) {
        console.error('[Orchestrator] Execution failed:', error);
        return null;
    }
}
