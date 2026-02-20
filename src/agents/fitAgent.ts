/**
 * Fit Verification Agent — Verified Fit Score Engine
 *
 * Industrial Logic: Virtual Try-On reduces returns by 35%.
 * This agent integrates with Perfect Corp AI to calculate a "Verified Fit Score"
 * and flags DPPs as "Low Return Risk" when fitScore >= 90%.
 *
 * API Sequence:
 *   1. Body measurements + product specs → Perfect Corp VTO API
 *   2. Calculate fit score with per-size breakdown
 *   3. Apply return risk classification (Low/Medium/High)
 *   4. Calculate sustainability impact (carbon savings)
 *   5. Return enriched result for DPP annotation
 */

import { getFitScore, type BodyMeasurements, type ProductSpecs, type FitVerificationResult } from '@/lib/perfectcorp';

// Agent metadata for the orchestrator
export const fitAgentDef = {
    id: 'fit-verification',
    name: 'Fit Verification Agent',
    capabilities: ['fit-score', 'virtual-try-on', 'return-risk'],
    status: 'active' as const,
};

/**
 * Verify fit and return enriched result with return risk flagging.
 * If fitScore >= 90%, the DPP is flagged as "Low Return Risk" to reduce carbon footprint.
 */
export async function verifyFit(
    bodyMeasurements: BodyMeasurements,
    productSpecs: ProductSpecs,
): Promise<FitVerificationResult> {
    console.log(`[FitAgent] Calculating verified fit score for ${productSpecs.fitType} ${productSpecs.category}`);

    const result = await getFitScore(bodyMeasurements, productSpecs);

    console.log(`[FitAgent] Score: ${result.score} | Size: ${result.recommendedSize} | Return Risk: ${result.returnRisk} | Source: ${result.source}`);

    // Log sustainability impact
    if (result.returnRisk === 'low') {
        console.log(`[FitAgent] 🌱 Low return risk — ${result.sustainabilityImpact.carbonSaved}`);
    }

    return result;
}
