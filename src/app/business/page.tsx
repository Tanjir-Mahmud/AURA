'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, getBrandForUser, getProductsByBrand, getBatchesByBrand } from '@/lib/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ─── Types ──────────────────────────────────
interface Product { id: string; brand_id: string; name: string; description: string | null; category: string; sku: string | null; materials: string | null; country_of_origin: string | null; weight_grams: number | null; dimensions: string | null; care_instructions: string | null; compliance_score: number; created_at: string; regulatory_risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; intelligence_data?: any; }
interface Batch { id: string; brand_id: string; product_id: string; batch_number: string; quantity: number; qr_generated_count: number; production_date: string; status: string; notes: string | null; created_at: string; product?: Product; }
interface DPPCode { id: string; serial_number: string; qr_data: string; status: string; scan_count: number; created_at: string; }
type PageView = 'dashboard' | 'products' | 'generate' | 'batches' | 'insights';

export default function BusinessDashboard() {
    const [brand, setBrand] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState<string | null>(null);

    // ─── QR Generation State ─────────────────
    const [genProductId, setGenProductId] = useState('');
    const [genQuantity, setGenQuantity] = useState(100);
    const [genBatchNumber, setGenBatchNumber] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState(0);
    const [generatedCodes, setGeneratedCodes] = useState<DPPCode[]>([]);
    const [lastBatchId, setLastBatchId] = useState<string | null>(null);
    const [lastQuantity, setLastQuantity] = useState(0);

    // ─── Product Creation State ──────────────
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        sku: '',
        category: 'Apparel',
        description: '',
        materials: '',
        country_of_origin: ''
    });

    // ─── Data Fetching ───────────────────────
    const fetchData = useCallback(async (brandId: string) => {
        try {
            const [prods, bts] = await Promise.all([
                getProductsByBrand(brandId),
                getBatchesByBrand(brandId)
            ]);
            setProducts(prods);
            setBatches(bts as any);
        } catch (err) {
            console.error('[Dashboard] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/auth/login?role=brand';
                return;
            }

            const brandData = await getBrandForUser(user.id);
            if (brandData) {
                setBrand(brandData);
                fetchData(brandData.id);
            } else {
                setLoading(false);
            }
        };
        init();
    }, [fetchData]);

    // Auto batch number
    useEffect(() => {
        const num = String(batches.length + 1).padStart(3, '0');
        setGenBatchNumber(`B2026-${num}`);
    }, [batches.length]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    const handleGenerate = useCallback(async () => {
        if (!genProductId || genQuantity < 1 || !brand) return;
        setIsGenerating(true);
        setGenProgress(20);

        try {
            const res = await fetch('/api/generate-dpp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand_id: brand.id,
                    product_id: genProductId,
                    batch_number: genBatchNumber,
                    quantity: genQuantity
                })
            });

            setGenProgress(60);
            const data = await res.json();

            if (data.success) {
                setGenProgress(100);
                setGeneratedCodes(data.codes);
                setLastBatchId(data.batch_id);
                setLastQuantity(data.quantity);
                fetchData(brand.id);
            }
        } catch (err) {
            console.error('[Generate] Error:', err);
        } finally {
            setIsGenerating(false);
        }
    }, [genProductId, genQuantity, genBatchNumber, brand, fetchData]);

    const handleDownloadPDF = async () => {
        if (!lastBatchId || !brand) return;
        setIsGenerating(true); // Reuse loading state

        try {
            // Fetch ALL codes for this batch
            const { data: allCodes, error } = await supabase
                .from('dpp_codes')
                .select('serial_number, qr_data')
                .eq('batch_id', lastBatchId);

            if (error) throw error;

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 10;
            const qrSize = 40;
            const padding = 10;
            const cols = 4;
            let x = margin;
            let y = margin;

            doc.setFontSize(16);
            doc.text(`Aura DPP QR Sheet — Batch: ${genBatchNumber}`, margin, 15);
            doc.setFontSize(10);
            doc.text(`Brand: ${brand.name} | Total QRs: ${allCodes.length}`, margin, 22);

            y = 30;

            allCodes.forEach((code: any, index: number) => {
                if (index > 0 && index % cols === 0) {
                    x = margin;
                    y += qrSize + padding;
                }

                if (y + qrSize > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    y = margin;
                    x = margin;
                }

                // Add QR image
                doc.addImage(code.qr_data, 'PNG', x, y, qrSize, qrSize);

                // Add Serial below (small)
                doc.setFontSize(6);
                doc.text(code.serial_number.split('-').slice(-2).join('-'), x + 2, y + qrSize + 3);

                x += qrSize + padding;
            });

            doc.save(`aura-qr-batch-${genBatchNumber}.pdf`);
        } catch (err) {
            console.error('[Download PDF] Error:', err);
            alert('Failed to generate PDF sheet.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brand) return;

        try {
            const { data, error } = await supabase
                .from('products')
                .insert([{
                    ...newProduct,
                    brand_id: brand.id,
                    compliance_score: 95 // Default mock compliance for now
                }])
                .select()
                .single();

            if (error) throw error;

            setIsAddingProduct(false);
            setNewProduct({ name: '', sku: '', category: 'Apparel', description: '', materials: '', country_of_origin: '' });
            fetchData(brand.id);
        } catch (err) {
            console.error('[Create Product] Error:', err);
            alert('Failed to create product.');
        }
    };

    const handleRunIntelligence = async (productId: string) => {
        setIsAnalyzing(productId);
        try {
            const res = await fetch('/api/intelligence/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });
            const data = await res.json();
            if (data.success && brand) {
                fetchData(brand.id);
            }
        } catch (err) {
            console.error('[Intelligence] Scan Error:', err);
        } finally {
            setIsAnalyzing(null);
        }
    };

    const handleExportIntelligenceReport = async (productId: string) => {
        setIsExporting(productId);
        try {
            const res = await fetch('/api/intelligence/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });
            const data = await res.json();
            if (data.success && data.reportUrl) {
                window.open(data.reportUrl, '_blank');
            }
        } catch (err) {
            console.error('[Intelligence] Export Error:', err);
        } finally {
            setIsExporting(null);
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="pulse" style={{ width: 40, height: 40, margin: '0 auto 20px', background: 'var(--accent-blue)', borderRadius: '50%' }} />
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Synchronizing Secure Vault...</p>
                </div>
            </div>
        );
    }

    if (!brand) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ marginBottom: 12 }}>No Brand Profile Found</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Please complete your registration.</p>
                    <button className="btn btn-primary" onClick={() => window.location.href = '/auth/signup'}>Complete Signup</button>
                </div>
            </div>
        );
    }

    const totalProducts = products.length;
    const totalDPPs = batches.reduce((sum, b) => sum + b.qr_generated_count, 0);
    const completedBatches = batches.filter(b => b.status === 'completed' || b.status === 'shipped').length;

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return renderBusinessHome();
            case 'products': return renderProductsView();
            case 'generate': return renderGenerateView();
            case 'batches': return renderBatchesView();
            case 'insights': return renderInsightsView();
            default: return renderBusinessHome();
        }
    };

    // ═══════════════════════════════════════════
    // Views (Internal Components)
    // ═══════════════════════════════════════════

    const renderBusinessHome = () => {
        return (
            <>
                <div className="kpi-grid">
                    <div className="kpi-card blue animate-in">
                        <div className="kpi-header"><div className="kpi-icon blue">📦</div></div>
                        <div className="kpi-value">{totalProducts}</div>
                        <div className="kpi-label">Active SKUs</div>
                    </div>
                    <div className="kpi-card green animate-in animate-in-delay-1">
                        <div className="kpi-header">
                            <div className="kpi-icon green">⚖️</div>
                            <span className="kpi-change positive">98% Avg</span>
                        </div>
                        <div className="kpi-value">{(completedBatches / (batches.length || 1) * 100).toFixed(0)}%</div>
                        <div className="kpi-label">Batch Compliance Rate</div>
                    </div>
                    <div className="kpi-card purple animate-in animate-in-delay-2">
                        <div className="kpi-header">
                            <div className="kpi-icon purple">💰</div>
                            <span className="kpi-change positive">+12.4%</span>
                        </div>
                        <div className="kpi-value">$142k</div>
                        <div className="kpi-label">Regulatory ROI (Est.)</div>
                    </div>
                    <div className="kpi-card amber animate-in animate-in-delay-3">
                        <div className="kpi-header">
                            <div className="kpi-icon amber">🔴</div>
                        </div>
                        <div className="kpi-value">
                            {batches.reduce((sum, b) => sum + (b.qr_generated_count > 0 ? 1 : 0), 0)}
                        </div>
                        <div className="kpi-label">Scans Detected (Real-time)</div>
                    </div>
                </div>

                <div className="section-grid">
                    <div className="section-card">
                        <div className="section-header">
                            <span className="section-title">🏭 Recent Production Batches</span>
                            <button className="btn btn-outline" onClick={() => setCurrentPage('batches')} style={{ fontSize: 11, padding: '6px 12px' }}>View All</button>
                        </div>
                        <div className="section-body" style={{ padding: 0 }}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Batch ID</th><th>Compliance</th><th>Auth Status</th><th>Lifecycle</th></tr>
                                </thead>
                                <tbody>
                                    {batches.length === 0 ? (
                                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No batches yet</td></tr>
                                    ) : (
                                        batches.slice(0, 5).map(b => (
                                            <tr key={b.id}>
                                                <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)' }}>{b.batch_number}</td>
                                                <td>
                                                    <div className="progress-bar" style={{ width: 60 }}>
                                                        <div className="progress-fill green" style={{ width: `92%` }} />
                                                    </div>
                                                </td>
                                                <td><span className="badge success">Verified</span></td>
                                                <td><span className={`status-dot ${b.status === 'completed' || b.status === 'shipped' ? 'active' : 'warning'}`} /> {b.status === 'completed' || b.status === 'shipped' ? 'Active Market' : 'Manufacturing'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="section-card">
                        <div className="section-header"><span className="section-title">⚡ AURA Orchestrator</span></div>
                        <div className="section-body">
                            <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 16 }}>
                                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Mission Status</div>
                                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent-cyan)' }}>Operational</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>All EU ESPR mandate endpoints are live.</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <button className="btn btn-primary" onClick={() => setCurrentPage('generate')}>📱 New Batch</button>
                                <button className="btn btn-outline" onClick={() => window.open('/factory', '_blank')}>🏭 Factory UI</button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const renderProductsView = () => {
        if (isAddingProduct) {
            return (
                <div className="section-card animate-in">
                    <div className="section-header">
                        <span className="section-title">📦 Register New Product</span>
                        <button className="btn btn-outline" onClick={() => setIsAddingProduct(false)}>Cancel</button>
                    </div>
                    <div className="section-body">
                        <form onSubmit={handleCreateProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">Product Name *</label>
                                <input type="text" className="form-input" required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. Organic Cotton T-Shirt" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">SKU / Reference *</label>
                                <input type="text" className="form-input" required value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="e.g. TS-2026-ORG" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-input" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                                    <option>Apparel</option>
                                    <option>Accessories</option>
                                    <option>Footwear</option>
                                    <option>Equipment</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Country of Origin</label>
                                <input type="text" className="form-input" value={newProduct.country_of_origin} onChange={e => setNewProduct({ ...newProduct, country_of_origin: e.target.value })} placeholder="e.g. Portugal" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Material Composition</label>
                                <input type="text" className="form-input" value={newProduct.materials} onChange={e => setNewProduct({ ...newProduct, materials: e.target.value })} placeholder="e.g. 100% Organic Cotton" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Product Description</label>
                                <textarea className="form-input" rows={3} value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Describe the product lifecycle, sustainability features, etc." style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2', marginTop: 10 }}>
                                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>✨ Register Product →</button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        }

        return (
            <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{products.length} products in catalog</div>
                    <button className="btn btn-primary" onClick={() => setIsAddingProduct(true)}>+ Add Product</button>
                </div>
                <div className="section-card">
                    <div className="section-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>Product</th><th>SKU</th><th>Category</th><th>Compliance</th><th>Intelligence</th></tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No products registered</td></tr>
                                ) : (
                                    products.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
                                            </td>
                                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{p.sku}</td>
                                            <td><span className="badge info">{p.category}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div className="progress-bar" style={{ width: 60 }}>
                                                        <div className="progress-fill green" style={{ width: `${p.compliance_score}%` }} />
                                                    </div>
                                                    <span style={{ fontWeight: 700, fontSize: 12 }}>{p.compliance_score}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    {p.regulatory_risk ? (
                                                        <span className={`badge ${p.regulatory_risk === 'LOW' ? 'success' : p.regulatory_risk === 'MEDIUM' ? 'warning' : 'danger'}`} style={{ fontSize: 10 }}>
                                                            {p.regulatory_risk} RISK
                                                        </span>
                                                    ) : (
                                                        <span className="badge info" style={{ fontSize: 10 }}>SCAN PENDING</span>
                                                    )}
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ padding: '4px 8px', fontSize: 10 }}
                                                        onClick={() => handleRunIntelligence(p.id)}
                                                        disabled={isAnalyzing === p.id}
                                                    >
                                                        {isAnalyzing === p.id ? '⏳' : '🧠'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        );
    }

    const renderGenerateView = () => {
        return (
            <div className="section-grid">
                <div className="section-card">
                    <div className="section-header"><span className="section-title">📱 Generate DPP QR Codes</span></div>
                    <div className="section-body">
                        <div className="form-group">
                            <label className="form-label">Product</label>
                            <select className="form-input" value={genProductId} onChange={e => setGenProductId(e.target.value)}>
                                <option value="">Select a product...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Batch Number</label>
                            <input type="text" className="form-input" value={genBatchNumber} onChange={e => setGenBatchNumber(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Quantity</label>
                            <input type="number" className="form-input" value={genQuantity} min={1} max={5000} onChange={e => setGenQuantity(parseInt(e.target.value) || 0)} />
                        </div>
                        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleGenerate} disabled={!genProductId || genQuantity < 1 || isGenerating}>
                            {isGenerating ? `⏳ Generating...` : `📱 Generate ${genQuantity.toLocaleString()} QR Codes`}
                        </button>
                    </div>
                </div>
                <div className="section-card">
                    <div className="section-header">
                        <span className="section-title">📋 Results</span>
                        {generatedCodes.length > 0 && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-outline" onClick={handleDownloadPDF} disabled={isGenerating}>
                                    📥 Download PDF Sheet
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="section-body">
                        {generatedCodes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>📱 Preview after generation</div>
                        ) : (
                            <div>
                                <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--accent-cyan)', fontWeight: 600 }}>
                                    ✅ Successfully generated {lastQuantity.toLocaleString()} QR Codes
                                </div>
                                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                    {generatedCodes.slice(0, 20).map((code) => (
                                        <div key={code.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                            <img src={code.qr_data} alt="QR" style={{ width: 40, height: 40, background: '#fff', padding: 2, borderRadius: 4 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: 'var(--accent-cyan)' }}>{code.serial_number}</div>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Active DPP Passport</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {lastQuantity > 20 && (
                                    <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                                        Showing first 20 codes. Use <b>Download PDF Sheet</b> for the full list of {lastQuantity.toLocaleString()} codes.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const renderBatchesView = () => {
        return (
            <div className="section-card">
                <div className="section-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead><tr><th>Batch #</th><th>Product</th><th>Date</th><th>Quantity</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {batches.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No batches generated</td></tr>
                            ) : (
                                batches.map(b => (
                                    <tr key={b.id}>
                                        <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)' }}>{b.batch_number}</td>
                                        <td style={{ fontWeight: 500 }}>{b.product?.name || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{new Date(b.created_at).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{b.quantity.toLocaleString()}</td>
                                        <td><span className={`badge ${b.status === 'completed' || b.status === 'shipped' ? 'success' : 'warning'}`}>{b.status === 'completed' || b.status === 'shipped' ? '✅ Complete' : '📋 Pending'}</span></td>
                                        <td>
                                            {(b.status === 'completed' || b.status === 'shipped') && (
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '4px 8px', fontSize: 11 }}
                                                    onClick={() => {
                                                        setLastBatchId(b.id);
                                                        setGenBatchNumber(b.batch_number); // Update for filename
                                                        setTimeout(handleDownloadPDF, 100);
                                                    }}
                                                >
                                                    📥 PDF
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    const renderInsightsView = () => {
        return (
            <div className="section-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="section-card animate-in">
                    <div className="section-header">
                        <span className="section-title">📊 Manufacturing Intelligence: Product Risk Matrix</span>
                        <span className="badge success">Verified Intelligence Layer</span>
                    </div>
                    <div className="section-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Product Identity</th>
                                    <th>Regulatory Watchdog</th>
                                    <th>Return Probability (ROI)</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No products registered</td></tr>
                                ) : (
                                    products.map(p => {
                                        const intel = p.intelligence_data;
                                        return (
                                            <tr key={p.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                    <div style={{ fontSize: 11, fontFamily: 'monospace' }}>SKU: {p.sku}</div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <span className={`badge ${p.regulatory_risk === 'LOW' ? 'success' : p.regulatory_risk === 'MEDIUM' ? 'warning' : 'danger'}`} style={{ width: 'fit-content' }}>
                                                            {p.regulatory_risk || 'PENDING'}
                                                        </span>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: '300px' }}>
                                                            {intel?.regulatoryRisk?.latestMandate || 'Run scan to fetch latest EU mandates.'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div className="progress-bar" style={{ width: 60 }}>
                                                                <div className={`progress-fill ${intel?.returnMetrics?.probability > 30 ? 'red' : 'green'}`} style={{ width: `${intel?.returnMetrics?.probability || 5}%` }} />
                                                            </div>
                                                            <span style={{ fontWeight: 700, fontSize: 13, color: intel?.returnMetrics?.probability > 30 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                                                {intel?.returnMetrics?.probability || 0}%
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            {intel?.returnMetrics?.designFlawSuspected ? '🚨 Design Flaw Suspected' : '🟢 Stable Performance'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button
                                                            className="btn btn-primary"
                                                            style={{ padding: '6px 12px', fontSize: 11 }}
                                                            onClick={() => handleRunIntelligence(p.id)}
                                                            disabled={isAnalyzing === p.id}
                                                        >
                                                            {isAnalyzing === p.id ? 'Analyzing...' : '🔄 Scan'}
                                                        </button>
                                                        <button
                                                            className="btn btn-outline"
                                                            style={{ padding: '6px 12px', fontSize: 11 }}
                                                            onClick={() => handleExportIntelligenceReport(p.id)}
                                                            disabled={isExporting === p.id || !p.regulatory_risk}
                                                        >
                                                            {isExporting === p.id ? 'Exporting...' : '📄 Report'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="section-grid" style={{ marginTop: 20 }}>
                    <div className="section-card">
                        <div className="section-header"><span className="section-title">🧠 You.com Prompt Status</span></div>
                        <div className="section-body" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            <div style={{ padding: 12, borderLeft: '2px solid var(--accent-cyan)', background: 'rgba(255,255,255,0.02)' }}>
                                Query active: "Latest EU ESPR requirements for [Category] February 2026"
                                <br /><br />
                                <b>Industrial Logic:</b> Currently indexing 2026 mandates to ensure product materials remain ESPR compliant before market entry.
                            </div>
                        </div>
                    </div>
                    <div className="section-card">
                        <div className="section-header"><span className="section-title">👗 Perfect Corp Return Logic</span></div>
                        <div className="section-body" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            <div style={{ padding: 12, borderLeft: '2px solid var(--accent-purple)', background: 'rgba(255,255,255,0.02)' }}>
                                Threshold: {`< 70% Fit Score = Design Flaw Trigger`}
                                <br /><br />
                                <b>ROI Driver:</b> Reducing return logistics costs by 15% through proactive design adjustments based on consumer VTO data.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const pageTitle: Record<PageView, string> = {
        dashboard: 'Dashboard',
        products: 'Products',
        generate: 'Generate QR Codes',
        batches: 'Production Batches',
        insights: 'Insights & Data',
    };

    return (
        <div className="app-layout">
            <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
                <div className="sidebar-brand">
                    <div className="logo" style={{ background: 'var(--gradient-success)' }}>{brand.name[0]}</div>
                    <div>
                        <h1>{brand.name}</h1>
                        <span className="version">ID: {brand.id.slice(0, 8)}...</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <span className="nav-section-title">Overview</span>
                        <button className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>⚡ Dashboard</button>
                    </div>
                    <div className="nav-section">
                        <span className="nav-section-title">Production</span>
                        <button className={`nav-item ${currentPage === 'products' ? 'active' : ''}`} onClick={() => setCurrentPage('products')}>📦 Products</button>
                        <button className={`nav-item ${currentPage === 'generate' ? 'active' : ''}`} onClick={() => setCurrentPage('generate')}>📱 Generate QR</button>
                        <button className={`nav-item ${currentPage === 'batches' ? 'active' : ''}`} onClick={() => setCurrentPage('batches')}>🏭 Batches</button>
                    </div>
                    <div className="nav-section">
                        <span className="nav-section-title">Intelligence</span>
                        <button className={`nav-item ${currentPage === 'insights' ? 'active' : ''}`} onClick={() => setCurrentPage('insights')}>📊 Insights <span className="nav-badge">🔒</span></button>
                    </div>
                </nav>
                <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)' }}>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: 13, cursor: 'pointer' }}>Logout Securely</button>
                </div>
            </aside>
            <main className="main-content">
                <header className="header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="sidebar-toggle">☰</button>
                        <h2 className="header-title">{pageTitle[currentPage]}</h2>
                    </div>
                    <div className="header-actions">
                        <div className="header-status"><span className="pulse" /> AES-256 Encrypted</div>
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => setCurrentPage('generate')}>📱 New Batch</button>
                    </div>
                </header>
                <div className="page-content">{renderPage()}</div>
            </main>
        </div>
    );
}
