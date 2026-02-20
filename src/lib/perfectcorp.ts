/**
 * Perfect Corp AI — Fit Score & Return Risk Engine
 *
 * Industrial Logic: Virtual Try-On (VTO) reduces returns by 35%.
 * If Fit Score ≥ 90%, the DPP is flagged as "Low Return Risk" — 
 * reducing carbon footprint from unnecessary shipping.
 *
 * API Sequence:
 *   1. Body measurements + product specs → Perfect Corp VTO API
 *   2. API returns fitScore, recommendedSize, and sizeBreakdown
 *   3. If fitScore >= 90 → flag DPP as "Low Return Risk"
 *   4. Calculate sustainability impact (carbon savings from fewer returns)
 *   5. Return enriched result with returnRisk and sustainability data
 *
 * Request Example:
 *   POST https://api.perfectcorp.com/v1/virtual-tryon/fit-analysis
 *   Headers: { "X-Api-Key": "{key}" }
 *   Body: { bodyMeasurements, productSpecs }
 *
 * Response Example:
 *   { score: 92, recommendedSize: "M", returnRisk: "low", sustainabilityImpact: {...} }
 */

const PERFECTCORP_API_KEY = process.env.PERFECTCORP_API_KEY || '';
const PERFECTCORP_API_URL = 'https://api.perfectcorp.com/v1/virtual-tryon';

// ─── Types ──────────────────────────────────
export interface BodyMeasurements {
    chest: number;
    waist: number;
    hips: number;
    height: number;
    weight?: number;
    shoulderWidth?: number;
    armLength?: number;
    inseam?: number;
}

export interface ProductSpecs {
    category: string;
    sizes: string[];
    sizeChart?: Record<string, { chest: number; waist: number; hips: number; length: number }>;
    fitType: 'Slim' | 'Regular' | 'Relaxed' | 'Oversized';
    material?: string;
    stretchFactor?: number;
}

export interface SizeScore {
    size: string;
    fitScore: number;
    notes: string;
}

export interface FitVerificationResult {
    score: number;
    recommendedSize: string;
    confidence: number;
    isVerifiedFit: boolean;
    returnRisk: 'low' | 'medium' | 'high';
    sustainabilityImpact: {
        estimatedReturnRate: string;
        carbonSaved: string;
        description: string;
    };
    sizeBreakdown: SizeScore[];
    source: 'perfectcorp' | 'algorithmic';
}

// ─── Return Risk Thresholds ─────────────────
const RETURN_RISK_THRESHOLDS = {
    low: 90,     // >= 90% = Low Return Risk
    medium: 70,  // >= 70% = Medium
    // < 70% = High
};

// Carbon savings per avoided return (kg CO₂e)
const CARBON_PER_RETURN = 2.3;

/**
 * Get return risk level based on fit score
 */
function getReturnRisk(score: number): 'low' | 'medium' | 'high' {
    if (score >= RETURN_RISK_THRESHOLDS.low) return 'low';
    if (score >= RETURN_RISK_THRESHOLDS.medium) return 'medium';
    return 'high';
}

/**
 * Calculate sustainability impact based on fit score
 */
function getSustainabilityImpact(score: number, returnRisk: string) {
    const estimatedReturnRates: Record<string, string> = {
        low: '< 5%',
        medium: '10-20%',
        high: '> 25%',
    };

    return {
        estimatedReturnRate: estimatedReturnRates[returnRisk] || '> 25%',
        carbonSaved: returnRisk === 'low'
            ? `${CARBON_PER_RETURN} kg CO₂e per avoided return`
            : returnRisk === 'medium'
                ? `${(CARBON_PER_RETURN * 0.5).toFixed(1)} kg CO₂e estimated savings`
                : '0 kg CO₂e — high return risk',
        description: returnRisk === 'low'
            ? '🌱 Excellent fit! Low return risk reduces carbon footprint from shipping.'
            : returnRisk === 'medium'
                ? '⚠️ Moderate fit. Consider trying a different size to minimize returns.'
                : '🔴 Poor fit detected. High return probability increases carbon impact.',
    };
}

/**
 * Verify fit using Perfect Corp VTO API.
 * Falls back to algorithmic calculation if API key is not configured.
 */
export async function getFitScore(
    bodyMeasurements: BodyMeasurements,
    productSpecs: ProductSpecs,
): Promise<FitVerificationResult> {
    // Try Perfect Corp API first
    if (PERFECTCORP_API_KEY) {
        try {
            const response = await fetch(`${PERFECTCORP_API_URL}/fit-analysis`, {
                method: 'POST',
                headers: {
                    'X-Api-Key': PERFECTCORP_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    body_measurements: {
                        chest_cm: bodyMeasurements.chest,
                        waist_cm: bodyMeasurements.waist,
                        hips_cm: bodyMeasurements.hips,
                        height_cm: bodyMeasurements.height,
                        weight_kg: bodyMeasurements.weight,
                        shoulder_width_cm: bodyMeasurements.shoulderWidth,
                        arm_length_cm: bodyMeasurements.armLength,
                        inseam_cm: bodyMeasurements.inseam,
                    },
                    product: {
                        category: productSpecs.category,
                        available_sizes: productSpecs.sizes,
                        fit_type: productSpecs.fitType,
                        material: productSpecs.material,
                        stretch_factor: productSpecs.stretchFactor ?? 1.0,
                        size_chart: productSpecs.sizeChart,
                    },
                }),
            });

            if (response.ok) {
                const apiResult = await response.json();
                const score = apiResult.fit_score || apiResult.score || 0;
                const returnRisk = getReturnRisk(score);

                return {
                    score,
                    recommendedSize: apiResult.recommended_size || 'M',
                    confidence: apiResult.confidence || 0.9,
                    isVerifiedFit: score >= RETURN_RISK_THRESHOLDS.low,
                    returnRisk,
                    sustainabilityImpact: getSustainabilityImpact(score, returnRisk),
                    sizeBreakdown: apiResult.size_breakdown?.map((s: { size: string; score: number; notes?: string }) => ({
                        size: s.size,
                        fitScore: s.score,
                        notes: s.notes || '',
                    })) || [],
                    source: 'perfectcorp',
                };
            }

            console.warn(`[PerfectCorp] API returned ${response.status}, falling back to algorithmic`);
        } catch (error) {
            console.error('[PerfectCorp] API error, falling back to algorithmic:', error);
        }
    }

    // ─── Algorithmic Fallback ───────────────
    return calculateAlgorithmicFit(bodyMeasurements, productSpecs);
}

/**
 * Algorithmic fit calculation — used when Perfect Corp API is unavailable.
 * Uses body measurements vs. size chart with tolerance ranges.
 */
function calculateAlgorithmicFit(
    body: BodyMeasurements,
    product: ProductSpecs,
): FitVerificationResult {
    const sizeBreakdown: SizeScore[] = [];

    // Default size chart if none provided
    const defaultChart: Record<string, { chest: number; waist: number; hips: number; length: number }> = {
        'XS': { chest: 82, waist: 66, hips: 88, length: 64 },
        'S': { chest: 88, waist: 72, hips: 94, length: 66 },
        'M': { chest: 96, waist: 80, hips: 100, length: 70 },
        'L': { chest: 104, waist: 88, hips: 106, length: 74 },
        'XL': { chest: 112, waist: 96, hips: 112, length: 76 },
        'XXL': { chest: 120, waist: 104, hips: 118, length: 78 },
    };

    const chart = product.sizeChart || defaultChart;
    const stretch = product.stretchFactor ?? 1.0;

    // Fit tolerance based on fit type
    const tolerances: Record<string, number> = {
        'Slim': 4,
        'Regular': 8,
        'Relaxed': 12,
        'Oversized': 16,
    };
    const tolerance = tolerances[product.fitType] || 8;

    for (const [size, dims] of Object.entries(chart)) {
        const chestDiff = Math.abs(body.chest - dims.chest * stretch);
        const waistDiff = Math.abs(body.waist - dims.waist * stretch);
        const hipsDiff = Math.abs(body.hips - dims.hips * stretch);

        const chestScore = Math.max(0, 100 - (chestDiff / tolerance) * 30);
        const waistScore = Math.max(0, 100 - (waistDiff / tolerance) * 30);
        const hipsScore = Math.max(0, 100 - (hipsDiff / tolerance) * 30);

        const avgScore = Math.round((chestScore * 0.4 + waistScore * 0.3 + hipsScore * 0.3));

        let notes = '';
        if (chestDiff > tolerance) notes += 'Tight in chest area. ';
        if (waistDiff > tolerance) notes += 'Waist may not fit. ';
        if (hipsDiff > tolerance) notes += 'Hip area may be uncomfortable. ';
        if (!notes) notes = avgScore >= 90 ? 'Perfect fit' : avgScore >= 70 ? 'Good fit' : 'Loose, acceptable';

        sizeBreakdown.push({ size, fitScore: avgScore, notes: notes.trim() });
    }

    // Sort by score and pick best
    sizeBreakdown.sort((a, b) => b.fitScore - a.fitScore);
    const bestFit = sizeBreakdown[0];
    const returnRisk = getReturnRisk(bestFit.fitScore);

    return {
        score: bestFit.fitScore,
        recommendedSize: bestFit.size,
        confidence: 0.85,
        isVerifiedFit: bestFit.fitScore >= RETURN_RISK_THRESHOLDS.low,
        returnRisk,
        sustainabilityImpact: getSustainabilityImpact(bestFit.fitScore, returnRisk),
        sizeBreakdown,
        source: 'algorithmic',
    };
}
