/**
 * Regulatory Scout Agent — EU ESPR Watchdog
 *
 * Industrial Logic: EU regulations change rapidly. This agent monitors for
 * amendments to the ESPR framework, textile destruction bans, and DPP
 * requirements. When critical changes are detected, it alerts affected brands.
 *
 * API Sequence:
 *   1. Trigger regulatory scan via You.com Research endpoint
 *   2. Parse results and classify severity
 *   3. Match against registered product categories
 *   4. Generate brand-specific risk alerts
 *   5. Return structured report
 */

import { scanRegulations, type RegulatoryScanReport } from '@/lib/yousearch';

// Agent metadata for the orchestrator
export const regulatoryScoutAgentDef = {
    id: 'regulatory-scout',
    name: 'Regulatory Scout Agent',
    capabilities: ['regulatory-scan', 'compliance-monitoring', 'alert-generation'],
    status: 'active' as const,
};

/**
 * Run the regulatory scout — scans for EU ESPR updates and generates alerts.
 */
export async function runRegulatoryScout(): Promise<RegulatoryScanReport> {
    console.log('[RegulatoryScout] Starting EU ESPR regulatory scan...');

    const report = await scanRegulations();

    if (report.success) {
        console.log(`[RegulatoryScout] Scan complete: ${report.totalResults} updates found`);

        const critical = report.updates.filter(u => u.severity === 'critical');
        const warnings = report.updates.filter(u => u.severity === 'warning');

        if (critical.length > 0) {
            console.warn(`[RegulatoryScout] ⚠️ ${critical.length} CRITICAL regulatory update(s) detected!`);
            for (const update of critical) {
                console.warn(`  → ${update.title} [${update.affectedCategories.join(', ')}]`);
            }
        }

        if (warnings.length > 0) {
            console.log(`[RegulatoryScout] 📋 ${warnings.length} warning(s) detected`);
        }

        if (report.brandAlerts.length > 0) {
            console.warn(`[RegulatoryScout] 🚨 ${report.brandAlerts.length} brand alert(s) generated`);
        }
    } else {
        console.error(`[RegulatoryScout] Scan failed: ${report.error}`);
    }

    return report;
}
