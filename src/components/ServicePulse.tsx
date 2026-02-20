'use client';

import { useState, useEffect } from 'react';

interface HealthData {
    overall: string;
    agents: any[];
    externalServices: { name: string; status: string }[];
}

export default function ServicePulse() {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await fetch('/api/health');
                if (res.ok) {
                    const data = await res.json();
                    setHealth(data.health);
                }
            } catch (err) {
                console.error('Failed to fetch pulse:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHealth();
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="pulse-loader">Pulse Loading...</div>;
    if (!health) return <div className="pulse-error">Pulse Offline</div>;

    const allStatus = [...health.agents.map(a => ({ name: a.agent, status: a.status })), ...health.externalServices];

    return (
        <div className="service-pulse-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '20px'
        }}>
            {allStatus.slice(0, 8).map((s, i) => (
                <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    borderRadius: '4px',
                    background: 'var(--bg-card)'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: s.status === 'healthy' ? '#10b981' : '#ef4444',
                        boxShadow: s.status === 'healthy' ? '0 0 8px #10b981' : '0 0 8px #ef4444'
                    }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {s.name.replace('_', ' ')}
                    </span>
                </div>
            ))}
        </div>
    );
}
