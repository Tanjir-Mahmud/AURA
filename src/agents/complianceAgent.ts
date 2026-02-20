/**
 * Compliance Agent — Validates product data against EU ESPR
 */

import { hashProductData } from '@/lib/hash';

interface ComplianceField {
    field: string;
    label: string;
    required: boolean;
    validator: (value: unknown) => boolean;
    message: string;
}

const ESPR_REQUIRED_FIELDS: ComplianceField[] = [
    { field: 'gtin', label: 'GTIN', required: true, validator: (v) => typeof v === 'string' && (v as string).length >= 8, message: 'Valid GTIN (8+ digits) required' },
    { field: 'productName', label: 'Product Name', required: true, validator: (v) => typeof v === 'string' && (v as string).length > 0, message: 'Product name required' },
    { field: 'brand', label: 'Brand', required: true, validator: (v) => typeof v === 'string' && (v as string).length > 0, message: 'Brand required' },
    { field: 'materials.composition', label: 'Materials Composition', required: true, validator: (v) => typeof v === 'string' && (v as string).length > 0, message: 'Material composition required for EU ESPR' },
    { field: 'materials.recycledContent', label: 'Recycled Content %', required: true, validator: (v) => typeof v === 'number' && (v as number) >= 0, message: 'Recycled content percentage required' },
    { field: 'materials.originCountry', label: 'Country of Origin', required: true, validator: (v) => typeof v === 'string' && (v as string).length === 2, message: 'ISO country code required' },
    { field: 'compliance.carbonFootprint', label: 'Carbon Footprint', required: true, validator: (v) => typeof v === 'number' && (v as number) > 0, message: 'Carbon footprint (kg CO₂e) required' },
    { field: 'compliance.repairabilityScore', label: 'Repairability Score', required: true, validator: (v) => typeof v === 'number' && (v as number) >= 0 && (v as number) <= 10, message: 'Repairability score (0-10) required' },
    { field: 'compliance.durabilityYears', label: 'Durability', required: true, validator: (v) => typeof v === 'number' && (v as number) > 0, message: 'Expected durability (years) required' },
    { field: 'compliance.recyclingInstructions', label: 'Recycling Instructions', required: true, validator: (v) => typeof v === 'string' && (v as string).length > 0, message: 'Recycling instructions required' },
];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((curr: unknown, key: string) => {
        if (curr && typeof curr === 'object') return (curr as Record<string, unknown>)[key];
        return undefined;
    }, obj);
}

export interface ComplianceResult {
    isCompliant: boolean;
    score: number; // 0-100
    passedChecks: number;
    totalChecks: number;
    findings: Array<{
        field: string;
        label: string;
        status: 'pass' | 'fail' | 'warning';
        message: string;
    }>;
    sha256Hash: string;
    auditedAt: string;
}

/**
 * Run a full EU ESPR compliance check on product data
 */
export function checkCompliance(product: Record<string, unknown>): ComplianceResult {
    const findings = ESPR_REQUIRED_FIELDS.map((check) => {
        const value = getNestedValue(product, check.field);
        const isValid = value !== undefined && value !== null && check.validator(value);

        return {
            field: check.field,
            label: check.label,
            status: isValid ? 'pass' as const : 'fail' as const,
            message: isValid ? 'Compliant' : check.message,
        };
    });

    const passedChecks = findings.filter((f) => f.status === 'pass').length;
    const totalChecks = findings.length;
    const score = Math.round((passedChecks / totalChecks) * 100);

    return {
        isCompliant: score === 100,
        score,
        passedChecks,
        totalChecks,
        findings,
        sha256Hash: hashProductData(product as Parameters<typeof hashProductData>[0]),
        auditedAt: new Date().toISOString(),
    };
}
