'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAdminMetrics } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import ServicePulse from '@/components/ServicePulse';

// ─── Types ──────────────────────────────────
interface BrandSummary {
    id: string;
    name: string;
    slug: string;
    plan: string;
    products: number;
    dpps: number;
    scans30d: number;
    revenue: number;
    created_at: string;
    is_active: boolean;
}

type AdminView = 'overview' | 'brands' | 'metrics' | 'roi' | 'scans';

const planPricing: Record<string, number> = { starter: 99, pro: 299, enterprise: 799 };

export default function AdminDashboard() {
    const [currentView, setCurrentView] = useState<AdminView>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [brandFilter, setBrandFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    // Real data state
    const [brands, setBrands] = useState<BrandSummary[]>([]);
    const [totalBrands, setTotalBrands] = useState(0);
    const [totalDPPs, setTotalDPPs] = useState(0);
    const [totalScans, setTotalScans] = useState(0);

    // ─── Fetch Real Data ─────────────────────
    const fetchDashboardData = useCallback(async () => {
        try {
            const metrics = await getAdminMetrics();
            setTotalBrands(metrics.totalBrands);
            setTotalDPPs(metrics.totalDPPs);
            setTotalScans(metrics.totalScans);

            // Enrich brands with per-brand metrics
            const sb = supabase;
            const enrichedBrands: BrandSummary[] = await Promise.all(
                (metrics.brands as Array<{ id: string; name: string; slug: string; plan: string; created_at: string }>).map(async (b) => {
                    const [prodRes, dppRes, scanRes] = await Promise.all([
                        sb.from('products').select('id', { count: 'exact', head: true }).eq('brand_id', b.id),
                        sb.from('dpp_codes').select('id', { count: 'exact', head: true }).eq('brand_id', b.id),
                        sb.from('dpp_scans').select('id', { count: 'exact', head: true }).eq('brand_id', b.id),
                    ]);

                    return {
                        id: b.id,
                        name: b.name,
                        slug: b.slug,
                        plan: b.plan || 'starter',
                        products: prodRes.count || 0,
                        dpps: dppRes.count || 0,
                        scans30d: scanRes.count || 0,
                        revenue: planPricing[b.plan || 'starter'] || 99,
                        created_at: b.created_at,
                        is_active: true,
                    };
                })
            );

            setBrands(enrichedBrands);
        } catch (err) {
            console.error('[Admin] Data fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const totalRevenue = brands.reduce((s, b) => s + b.revenue, 0);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="pulse" style={{ width: 40, height: 40, margin: '0 auto 20px', background: 'var(--accent-blue)', borderRadius: '50%' }} />
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading Platform Data...</p>
                </div>
            </div>
        );
    }

    const renderPage = () => {
        switch (currentView) {
            case 'overview': return <OverviewView />;
            case 'brands': return <BrandsView />;
            case 'metrics': return <MetricsView />;
            case 'roi': return <ROIView />;
            case 'scans': return <ScansView />;
            default: return <OverviewView />;
        }
    };

    // ═════════════════════════════════════════
    // Overview — Bird's Eye View
    // ═════════════════════════════════════════
    function OverviewView() {
        return (
            <>
                <div className="kpi-grid">
                    <div className="kpi-card blue animate-in">
                        <div className="kpi-header"><div className="kpi-icon blue">🏢</div></div>
                        <div className="kpi-value">{totalBrands}</div>
                        <div className="kpi-label">Active Brands</div>
                    </div>
                    <div className="kpi-card green animate-in animate-in-delay-1">
                        <div className="kpi-header"><div className="kpi-icon green">📱</div></div>
                        <div className="kpi-value">{totalDPPs.toLocaleString()}</div>
                        <div className="kpi-label">Total DPPs Generated</div>
                    </div>
                    <div className="kpi-card purple animate-in animate-in-delay-2">
                        <div className="kpi-header"><div className="kpi-icon purple">📊</div></div>
                        <div className="kpi-value">{totalScans.toLocaleString()}</div>
                        <div className="kpi-label">Total Scans</div>
                    </div>
                    <div className="kpi-card amber animate-in animate-in-delay-3">
                        <div className="kpi-header"><div className="kpi-icon amber">💰</div></div>
                        <div className="kpi-value">${totalRevenue.toLocaleString()}</div>
                        <div className="kpi-label">Monthly Revenue</div>
                    </div>
                </div>

                <div className="section-grid">
                    <div className="section-card">
                        <div className="section-header">
                            <span className="section-title">🏆 Top Brands by DPP Count</span>
                        </div>
                        <div className="section-body">
                            {brands.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No brands registered yet</div>
                            ) : (
                                [...brands].sort((a, b) => b.dpps - a.dpps).map((b, i) => (
                                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < brands.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%',
                                            background: i === 0 ? 'var(--gradient-warning)' : i === 1 ? 'var(--gradient-primary)' : 'var(--bg-card)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12, fontWeight: 700, flexShrink: 0, color: i < 2 ? '#fff' : 'var(--text-muted)',
                                        }}>{i + 1}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.products} products</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: 14 }}>{b.dpps.toLocaleString()}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>DPPs</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="section-card">
                        <div className="section-header">
                            <span className="section-title">📊 Platform Summary</span>
                            <span className="badge info">Live</span>
                        </div>
                        <div className="section-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Avg DPPs per Brand</span>
                                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{totalBrands > 0 ? Math.round(totalDPPs / totalBrands).toLocaleString() : 0}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Scan Rate</span>
                                    <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{totalDPPs > 0 ? ((totalScans / totalDPPs) * 100).toFixed(1) : 0}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Enterprise Accounts</span>
                                    <span style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>{brands.filter(b => b.plan === 'enterprise').length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ═════════════════════════════════════════
    // Brands View
    // ═════════════════════════════════════════
    function BrandsView() {
        return (
            <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{totalBrands} active brands on platform</div>
                </div>
                <div className="section-card">
                    <div className="section-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>Brand</th><th>Plan</th><th>Products</th><th>DPPs</th><th>Scans</th><th>Revenue</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {brands.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No brands registered</td></tr>
                                ) : (
                                    brands.map(b => (
                                        <tr key={b.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                                                        {b.name[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{b.slug}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className={`badge ${b.plan === 'enterprise' ? 'success' : b.plan === 'pro' ? 'info' : 'warning'}`}>{b.plan}</span></td>
                                            <td style={{ fontWeight: 600 }}>{b.products}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{b.dpps.toLocaleString()}</td>
                                            <td>{b.scans30d.toLocaleString()}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>${b.revenue.toLocaleString()}</td>
                                            <td><span className="badge success">Active</span></td>
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

    // ═════════════════════════════════════════
    // Metrics View — DPP per brand
    // ═════════════════════════════════════════
    function MetricsView() {
        const sortedBrands = [...brands].sort((a, b) => b.dpps - a.dpps);
        const maxDPP = sortedBrands[0]?.dpps || 1;

        return (
            <>
                <div className="kpi-grid">
                    <div className="kpi-card green animate-in">
                        <div className="kpi-header"><div className="kpi-icon green">📱</div></div>
                        <div className="kpi-value">{totalDPPs.toLocaleString()}</div>
                        <div className="kpi-label">Total DPPs Platform-wide</div>
                    </div>
                    <div className="kpi-card blue animate-in animate-in-delay-1">
                        <div className="kpi-header"><div className="kpi-icon blue">📈</div></div>
                        <div className="kpi-value">{totalBrands > 0 ? Math.round(totalDPPs / totalBrands).toLocaleString() : 0}</div>
                        <div className="kpi-label">Avg DPPs per Brand</div>
                    </div>
                    <div className="kpi-card purple animate-in animate-in-delay-2">
                        <div className="kpi-header"><div className="kpi-icon purple">🏆</div></div>
                        <div className="kpi-value">{sortedBrands[0]?.name || '—'}</div>
                        <div className="kpi-label">Top DPP Generator</div>
                    </div>
                    <div className="kpi-card amber animate-in animate-in-delay-3">
                        <div className="kpi-header"><div className="kpi-icon amber">📊</div></div>
                        <div className="kpi-value">{totalDPPs > 0 ? ((totalScans / totalDPPs) * 100).toFixed(1) : 0}%</div>
                        <div className="kpi-label">Scan Rate</div>
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-header">
                        <span className="section-title">📱 DPPs Generated by Brand</span>
                    </div>
                    <div className="section-body">
                        {sortedBrands.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data yet</div>
                        ) : (
                            sortedBrands.map(b => (
                                <div key={b.id} style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-cyan)' }}>{b.dpps.toLocaleString()}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 12 }}>
                                        <div className="progress-fill green" style={{ width: `${(b.dpps / maxDPP) * 100}%` }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </>
        );
    }

    // ═════════════════════════════════════════
    // ROI View
    // ═════════════════════════════════════════
    function ROIView() {
        const monthlyMRR = brands.reduce((s, b) => s + (planPricing[b.plan] || 99), 0);
        const annualARR = monthlyMRR * 12;

        return (
            <>
                <div className="kpi-grid">
                    <div className="kpi-card green animate-in">
                        <div className="kpi-header"><div className="kpi-icon green">💰</div></div>
                        <div className="kpi-value">${monthlyMRR.toLocaleString()}</div>
                        <div className="kpi-label">Monthly Recurring Revenue</div>
                    </div>
                    <div className="kpi-card blue animate-in animate-in-delay-1">
                        <div className="kpi-header"><div className="kpi-icon blue">📈</div></div>
                        <div className="kpi-value">${annualARR.toLocaleString()}</div>
                        <div className="kpi-label">Annual Run Rate (ARR)</div>
                    </div>
                    <div className="kpi-card purple animate-in animate-in-delay-2">
                        <div className="kpi-header"><div className="kpi-icon purple">🏢</div></div>
                        <div className="kpi-value">${totalBrands > 0 ? Math.round(monthlyMRR / totalBrands) : 0}</div>
                        <div className="kpi-label">ARPU (Monthly)</div>
                    </div>
                    <div className="kpi-card amber animate-in animate-in-delay-3">
                        <div className="kpi-header"><div className="kpi-icon amber">💎</div></div>
                        <div className="kpi-value">{brands.filter(b => b.plan === 'enterprise').length}</div>
                        <div className="kpi-label">Enterprise Accounts</div>
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-header">
                        <span className="section-title">💰 Revenue by Plan</span>
                    </div>
                    <div className="section-body">
                        {['enterprise', 'pro', 'starter'].map(plan => {
                            const planBrands = brands.filter(b => b.plan === plan);
                            const rev = planBrands.length * (planPricing[plan] || 0);
                            return (
                                <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span className={`badge ${plan === 'enterprise' ? 'success' : plan === 'pro' ? 'info' : 'warning'}`} style={{ width: 80, textAlign: 'center' }}>{plan}</span>
                                        <span style={{ fontSize: 13 }}>{planBrands.length} brands × ${planPricing[plan]}/mo</span>
                                    </div>
                                    <span style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 15 }}>${rev.toLocaleString()}/mo</span>
                                </div>
                            );
                        })}
                        <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: 'var(--accent-green)' }}>
                            <span>Total MRR</span>
                            <span>${monthlyMRR.toLocaleString()}/mo</span>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ═════════════════════════════════════════
    // Scans View
    // ═════════════════════════════════════════
    function ScansView() {
        const filteredBrands = brandFilter === 'all' ? brands : brands.filter(b => b.id === brandFilter);
        const filteredScans = filteredBrands.reduce((s, b) => s + b.scans30d, 0);

        return (
            <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Filter by Brand:</label>
                    <select className="form-input" style={{ width: 200 }} value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                        <option value="all">All Brands</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>

                <div className="kpi-grid">
                    <div className="kpi-card purple animate-in">
                        <div className="kpi-header"><div className="kpi-icon purple">📊</div></div>
                        <div className="kpi-value">{filteredScans.toLocaleString()}</div>
                        <div className="kpi-label">Total Scans</div>
                    </div>
                    <div className="kpi-card blue animate-in animate-in-delay-1">
                        <div className="kpi-header"><div className="kpi-icon blue">📅</div></div>
                        <div className="kpi-value">{Math.round(filteredScans / 30).toLocaleString()}</div>
                        <div className="kpi-label">Avg Daily Scans</div>
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-header">
                        <span className="section-title">🏢 Scans by Brand</span>
                    </div>
                    <div className="section-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead><tr><th>Brand</th><th>Scans</th><th>DPPs</th><th>Scan Rate</th></tr></thead>
                            <tbody>
                                {brands.length === 0 ? (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data</td></tr>
                                ) : (
                                    [...brands].sort((a, b) => b.scans30d - a.scans30d).map(b => (
                                        <tr key={b.id}>
                                            <td style={{ fontWeight: 600 }}>{b.name}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{b.scans30d.toLocaleString()}</td>
                                            <td>{b.dpps.toLocaleString()}</td>
                                            <td>
                                                <span style={{ fontWeight: 600, color: b.dpps > 0 && (b.scans30d / b.dpps) > 0.5 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                                                    {b.dpps > 0 ? ((b.scans30d / b.dpps) * 100).toFixed(1) : 0}%
                                                </span>
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

    // ═════════════════════════════════════════
    // Layout
    // ═════════════════════════════════════════
    const viewTitle: Record<AdminView, string> = {
        overview: 'Platform Overview',
        brands: 'Brand Management',
        metrics: 'DPP Metrics',
        roi: 'ROI Tracking',
        scans: 'Scan Analytics',
    };

    return (
        <div className="app-layout">
            <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
                <div className="sidebar-brand">
                    <div className="logo">A</div>
                    <div>
                        <h1>AURA Admin</h1>
                        <span className="version">Platform Dashboard</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <span className="nav-section-title">Platform</span>
                        <button className={`nav-item ${currentView === 'overview' ? 'active' : ''}`} onClick={() => setCurrentView('overview')}>
                            <span className="nav-icon">⚡</span> Overview
                        </button>
                        <button className={`nav-item ${currentView === 'brands' ? 'active' : ''}`} onClick={() => setCurrentView('brands')}>
                            <span className="nav-icon">🏢</span> Brands
                        </button>
                    </div>
                    <div className="nav-section">
                        <span className="nav-section-title">Analytics</span>
                        <button className={`nav-item ${currentView === 'metrics' ? 'active' : ''}`} onClick={() => setCurrentView('metrics')}>
                            <span className="nav-icon">📱</span> DPP Metrics
                        </button>
                        <button className={`nav-item ${currentView === 'roi' ? 'active' : ''}`} onClick={() => setCurrentView('roi')}>
                            <span className="nav-icon">💰</span> ROI Tracking
                        </button>
                        <button className={`nav-item ${currentView === 'scans' ? 'active' : ''}`} onClick={() => setCurrentView('scans')}>
                            <span className="nav-icon">📊</span> Scan Analytics
                        </button>
                    </div>
                </nav>
                <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)' }}>
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: 13, cursor: 'pointer' }}>Logout Securely</button>
                </div>
            </aside>
            <main className="main-content">
                <header className="header" style={{ marginBottom: 0, paddingBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="sidebar-toggle">☰</button>
                        <h2 className="header-title">{viewTitle[currentView]}</h2>
                    </div>
                    <div className="header-actions">
                        <div className="header-status"><span className="pulse" /> All Systems Healthy</div>
                    </div>
                </header>

                <div style={{ padding: '0 24px', marginTop: '10px' }}>
                    <ServicePulse />
                </div>

                <div className="page-content">{renderPage()}</div>
            </main>
        </div>
    );
}
