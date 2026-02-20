'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = searchParams.get('role') || 'brand';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Both admin and brand use Supabase Auth
            const { error: sbErr } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (sbErr) throw sbErr;

            // Redirect based on role — server middleware validates admin access
            // Ensure cookies are flushed before redirect
            router.refresh();
            if (role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/business');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Authentication failed.';
            console.error('[Login] Error:', err);
            setError(message);
            setLoading(false);
        }
    };

    return (
        <div className="verify-page">
            <div className="verify-container" style={{ textAlign: 'left' }}>
                <div className="verify-brand-header">
                    <div className="verify-logo">A</div>
                    <div>
                        <h1 className="verify-brand-name">AURA Portals</h1>
                        <span className="verify-badge-verified">Secure Gateway</span>
                    </div>
                </div>

                <div className="section-card" style={{ marginTop: '20px' }}>
                    <div className="section-header">
                        <span className="section-title">
                            {role === 'admin' ? '⚡ Platform Admin Login' : '🏢 Brand Partner Login'}
                        </span>
                    </div>
                    <div className="section-body">
                        <form onSubmit={handleLogin}>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && (
                                <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '16px', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '4px' }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg"
                                style={{ width: '100%' }}
                                disabled={loading}
                            >
                                {loading ? 'Authenticating...' : 'Sign In →'}
                            </button>
                        </form>

                        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {role === 'brand' ? (
                                <>New here? <a href="/auth/signup" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Create a brand account</a></>
                            ) : (
                                <a href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to selection</a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
