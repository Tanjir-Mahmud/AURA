/**
 * Fit Analytics Engine — AURA Intelligence Layer
 *
 * Industrial Logic: Low fit scores are the leading indicator for
 * logistics returns. By identifying SKUs with <70% fit satisfaction,
 * we can alert designers to potential sizing flaws before the next batch.
 */

import { IntelligenceRecord } from './types';
import { supabase } from '@/lib/supabase';

export async function runFitAnalytics(productId: string): Promise<Partial<IntelligenceRecord['returnMetrics']> | null> {
    console.log(`[FitAnalytics] Calculating return probability for product: ${productId}...`);

    try {
        // 1. Fetch all scans for this product that have a fit_score
        // Note: Joining with dpp_codes to filter by product_id
        const { data: scans, error } = await supabase
            .from('dpp_scans')
            .select('fit_score, dpp_codes!inner(product_id)')
            .eq('dpp_codes.product_id', productId)
            .not('fit_score', 'is', null);

        if (error) throw error;

        if (!scans || scans.length === 0) {
            return {
                averageFitScore: 0,
                sampleSize: 0,
                probability: 0,
                alertTriggered: false,
                designFlawSuspected: false
            };
        }

        // 2. Aggregate Metrics
        const totalScore = scans.reduce((sum: number, scan: any) => sum + (scan.fit_score || 0), 0);
        const averageFitScore = totalScore / scans.length;
        const sampleSize = scans.length;

        // Return Probability Heuristic:
        // - Score 90-100: 5% return prob
        // - Score 70-89: 15% return prob
        // - Score < 70: 40%+ return prob (Design Flaw)
        let probability = 5;
        if (averageFitScore < 70) probability = 45;
        else if (averageFitScore < 90) probability = 15;

        const designFlawSuspected = averageFitScore < 70 && sampleSize > 5;
        const alertTriggered = designFlawSuspected;

        const metrics = {
            averageFitScore,
            sampleSize,
            probability,
            alertTriggered,
            designFlawSuspected
        };

        console.log(`[FitAnalytics] Analysis Complete: Avg Score ${averageFitScore.toFixed(1)}% | Return Prob: ${probability}%`);

        return metrics;

    } catch (error) {
        console.error('[FitAnalytics] Error during analysis:', error);
        return null;
    }
}
