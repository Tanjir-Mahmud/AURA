/**
 * MISSION: DEVELOP AURA - Step 2.3
 * /api/regulatory-check
 * 
 * Use You.com Search to find the latest EU 2026 mandates 
 * and return a 'Compliance Risk Score'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runRegulatoryScout } from '@/agents/regulatoryScoutAgent';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        console.log('[API Regulatory-Check] Running You.com powered scan for EU 2026 mandates...');

        // Process via Regulatory Scout Agent
        const report = await runRegulatoryScout();

        // Calculate a 'Compliance Risk Score' based on severity of updates
        // Critical updates increase risk score
        const criticalCount = report.updates.filter(u => u.severity === 'critical').length;
        const warningCount = report.updates.filter(u => u.severity === 'warning').length;

        // Base score 100, deduct points for risks
        const riskScore = Math.max(0, 100 - (criticalCount * 25) - (warningCount * 10));

        return NextResponse.json({
            success: true,
            complianceRiskScore: riskScore,
            summary: report.summary,
            alerts: report.brandAlerts,
            updates: report.updates.slice(0, 5) // Return top 5 updates
        });
    } catch (error: any) {
        console.error('[API Regulatory-Check] Error:', error);
        return NextResponse.json({
            error: error.message || 'Regulatory check failed'
        }, { status: 500 });
    }
}
