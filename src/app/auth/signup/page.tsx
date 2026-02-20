'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        brandName: '',
        email: '',
        password: '',
        industry: 'Fashion & Apparel'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register-brand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            // Log in the user immediately after admin creation
            const { error: loginErr } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (loginErr) throw loginErr;

            // Ensure cookies are flushed before redirect
            router.refresh();
            router.push('/business');
        } catch (err: any) {
            console.error('[Signup] Error:', err);
            const friendlyError = err.message || 'Registration failed';
            setError(friendlyError.includes('API key')
                ? `${friendlyError} - Please ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel settings.`
                : friendlyError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="verify-page">
            <div className="verify-container" style={{ textAlign: 'left' }}>
                <div className="verify-brand-header">
                    <div className="verify-logo">A</div>
                    <div>
                        <h1 className="verify-brand-name">AURA Brand Signup</h1>
                        <span className="verify-badge-verified">Onboarding Platform</span>
                    </div>
                </div>

                <div className="section-card" style={{ marginTop: '20px' }}>
                    <div className="section-header">
                        <span className="section-title">🏢 Register Your Brand</span>
                    </div>
                    <div className="section-body">
                        <form onSubmit={handleSignup}>
                            <div className="form-group">
                                <label className="form-label">Brand Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Laco Fashion"
                                    required
                                    value={formData.brandName}
                                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Official Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="contact@brand.com"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Industry</label>
                                <select
                                    className="form-input"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                >
                                    <option>Fashion & Apparel</option>
                                    <option>Electronics</option>
                                    <option>Cosmetics</option>
                                    <option>Consumer Goods</option>
                                    <option>Industrial</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Choose Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            {error && (
                                <div style={{ color: 'var(--accent-red)', fontSize: '13px', marginBottom: '16px', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg"
                                style={{ width: '100%' }}
                                disabled={loading}
                            >
                                {loading ? 'Creating Account...' : 'Get Started →'}
                            </button>
                        </form>

                        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                            Already registered? <a href="/auth/login?role=brand" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Log in here</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
