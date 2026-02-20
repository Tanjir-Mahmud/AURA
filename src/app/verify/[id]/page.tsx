'use client';

import React, { useState, useEffect } from 'react';

interface ProductData {
    name: string;
    description: string | null;
    category: string;
    materials: string | null;
    country_of_origin: string | null;
    care_instructions: string | null;
    compliance_score: number;
}

interface BrandData {
    name: string;
    slug: string;
    website: string | null;
}

interface VerifyResult {
    verified: boolean;
    serial_number: string;
    status: string;
    scan_count: number;
    product: ProductData;
    brand: BrandData;
    passport_hash: string;
    created_at: string;
    scanId?: string; // Added for Feature 2
}

export default function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    const [result, setResult] = useState<VerifyResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [hasRated, setHasRated] = useState(false);
    const [scanId, setScanId] = useState<string | null>(null);

    useEffect(() => {
        // Call real verification API
        async function verifyProduct() {
            try {
                const res = await fetch(`/api/verify-dpp?serial=${encodeURIComponent(id)}`);
                const data = await res.json();

                if (res.ok && data.verified) {
                    setResult(data);
                    if (data.scanId) setScanId(data.scanId);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error('[Verify] API error:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        verifyProduct();
    }, [id]);

    const handleRateFit = async (score: number) => {
        if (!scanId) return;
        try {
            const res = await fetch('/api/rate-fit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scanId, fitScore: score })
            });
            if (res.ok) {
                setHasRated(true);
            }
        } catch (err) {
            console.error('[RateFit] Error:', err);
        }
    };

    if (loading) {
        return (
            <div className="verify-page">
                <div className="verify-container">
                    <div className="verify-loading">
                        <div className="verify-spinner" />
                        <h2>Verifying Product...</h2>
                        <p>Checking Digital Product Passport</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="verify-page">
                <div className="verify-container">
                    <div className="verify-error">
                        <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
                        <h2>Product Not Found</h2>
                        <p>This QR code does not match any registered product passport.</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Serial: {id}</p>
                        <a href="/" className="btn btn-primary" style={{ marginTop: 24 }}>← Back to AURA</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="verify-page glassmorphism-bg" style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at top right, #1a1a2e, #0f0f1a)',
            color: '#fff',
            padding: '20px',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <div className="verify-container" style={{
                maxWidth: '500px',
                margin: '40px auto',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                borderRadius: '32px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Brand Header */}
                <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, #00f2ff, #0066ff)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, margin: '0 auto 16px', boxShadow: '0 0 20px rgba(0,242,255,0.4)' }}>
                        {result.brand.name[0]}
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{result.brand.name}</h1>
                    <div style={{ fontSize: 12, color: '#00f2ff', textTransform: 'uppercase', letterSpacing: '2px', marginTop: 8, fontWeight: 600 }}>Authentic Product</div>
                </div>

                {/* The Product Story (MISSION SPEC) */}
                <div style={{ padding: '30px' }}>
                    <div style={{ position: 'relative', marginBottom: 30 }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: 8 }}>Product Story</div>
                        <h2 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>{result.product.name}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginTop: 12, fontSize: 15 }}>
                            {result.product.description || "Every stitch tells a journey of sustainability and craftsmanship. From the factory floor to your hands, this product represents a commitment to the EU 2026 ESPR mandate."}
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: 30 }}>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Materials</div>
                            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Organic Cotton</div>
                        </div>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Origin</div>
                            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{result.product.country_of_origin}</div>
                        </div>
                    </div>

                    {/* EU ESPR Compliance Metric */}
                    <div style={{ marginBottom: 30 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>ESPR Compliance</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#00ffa3' }}>{result.product.compliance_score}%</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${result.product.compliance_score}%`, height: '100%', background: 'linear-gradient(90deg, #00f2ff, #00ffa3)' }} />
                        </div>
                    </div>

                    {/* Signed Passport Download (MISSION SPEC) */}
                    <button
                        onClick={() => window.open('/api/generate-passport', '_blank')}
                        style={{
                            width: '100%',
                            padding: '18px',
                            background: 'linear-gradient(135deg, #00f2ff, #0066ff)',
                            border: 'none',
                            borderRadius: '16px',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 16,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            boxShadow: '0 10px 20px rgba(0,242,255,0.2)'
                        }}
                    >
                        <span>📄</span> Download Signed Legal Passport
                    </button>
                    <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>
                        Immutability Hash: {result.passport_hash?.slice(0, 16)}...
                    </p>
                </div>

                {/* Footer History */}
                <div style={{ padding: '30px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>VTO Fit Satisfaction</h4>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Power by Perfect Corp</span>
                    </div>

                    {!hasRated ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            {[20, 40, 60, 80, 100].map((score) => (
                                <button
                                    key={score}
                                    onClick={() => handleRateFit(score)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 8px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {score}%
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(0,255,163,0.05)', borderRadius: '12px', border: '1px solid rgba(0,255,163,0.2)' }}>
                            <span style={{ color: '#00ffa3', fontSize: 13, fontWeight: 600 }}>✨ Thank you for the feedback!</span>
                        </div>
                    )}

                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '24px 0' }} />

                    <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Life Cycle Record</h4>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ffa3' }} />
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                            Production Certified — {new Date(result.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>

            <footer style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                AURA UNIVERSAL LIFECYCLE ORCHESTRATOR | JULY 2026 COMPLIANT
            </footer>
        </div>
    );
}
