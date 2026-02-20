/**
 * AURA Intelligence Layer — Core Types
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IntelligenceRecord {
    id: string;
    targetId: string; // SKU or Batch ID
    targetType: 'PRODUCT' | 'BATCH';
    timestamp: string;

    // Feature 1: Regulatory Intelligence
    regulatoryRisk: {
        score: number; // 0-100
        level: RiskLevel;
        latestMandate: string; // Summary of You.com findings
        mismatchedMaterials: string[]; // Materials found in Sanity but flagged by You.com
        sourceUrls: string[];
    };

    // Feature 2: Return Probability (Perfect Corp)
    returnMetrics: {
        averageFitScore: number;
        sampleSize: number;
        probability: number; // calculated percentage
        alertTriggered: boolean;
        designFlawSuspected: boolean;
    };

    // Feature 4: Report References
    executiveReportUrl?: string; // Foxit Signed PDF
}

export interface IntelligenceAlert {
    id: string;
    type: 'REGULATORY_RISK' | 'HIGH_RETURN_PROBABILITY' | 'COMPLIANCE_DRIFT';
    severity: RiskLevel;
    message: string;
    actionRequired: string;
    createdAt: string;
    resolved: boolean;
}
