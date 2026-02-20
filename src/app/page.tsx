'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'business' | 'admin'>('business');

  return (
    <div className="landing-page">
      {/* Animated Background */}
      <div className="landing-bg">
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-orb orb-3" />
      </div>

      {/* Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <div className="logo-mark">A</div>
          <span className="logo-text">AURA</span>
        </div>
        <div className="landing-nav">
          <button className="btn btn-outline" onClick={() => router.push('/verify/demo')}>
            🔍 Verify Product
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-badge animate-in">DPP & QR Management Platform</div>
        <h1 className="hero-title animate-in animate-in-delay-1">
          Digital Product Passports<br />
          <span className="gradient-text">Made Simple</span>
        </h1>
        <p className="hero-subtitle animate-in animate-in-delay-2">
          Generate unique DPP QR codes for every product. Track production batches.
          EU ESPR compliant. Real-time scan analytics.
        </p>

        {/* Portal Selector */}
        <div className="portal-selector animate-in animate-in-delay-3">
          <div className="portal-tabs">
            <button
              className={`portal-tab ${activeTab === 'business' ? 'active' : ''}`}
              onClick={() => setActiveTab('business')}
            >
              🏢 I&apos;m a Brand
            </button>
            <button
              className={`portal-tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              ⚡ Platform Admin
            </button>
          </div>

          <div className="portal-content">
            {activeTab === 'business' ? (
              <div className="portal-card">
                <h3>Business Dashboard</h3>
                <ul className="portal-features">
                  <li>📦 Enter product details &amp; batch quantity</li>
                  <li>📱 Generate unique DPP QR per item</li>
                  <li>📊 Track production batches &amp; sales</li>
                  <li>🔒 Private supplier &amp; team data</li>
                  <li>🏷️ Branded QR codes &amp; landing pages</li>
                </ul>
                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                  <button
                    className="btn btn-primary btn-lg"
                    style={{ flex: 1 }}
                    onClick={() => router.push('/auth/login?role=brand')}
                  >
                    Login
                  </button>
                  <button
                    className="btn btn-outline btn-lg"
                    style={{ flex: 1 }}
                    onClick={() => router.push('/auth/signup')}
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            ) : (
              <div className="portal-card">
                <h3>Admin Dashboard</h3>
                <ul className="portal-features">
                  <li>👁️ Bird&apos;s-eye view of all brands</li>
                  <li>📈 DPP metrics per brand</li>
                  <li>💰 ROI tracking &amp; financials</li>
                  <li>📊 Daily/monthly scan analytics</li>
                  <li>🛡️ System health monitoring</li>
                </ul>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  onClick={() => router.push('/auth/login?role=admin')}
                >
                  Admin Login →
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="landing-stats animate-in animate-in-delay-3">
        <div className="stat-item">
          <div className="stat-value">50K+</div>
          <div className="stat-label">DPPs Generated</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">120+</div>
          <div className="stat-label">Active Brands</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">1M+</div>
          <div className="stat-label">QR Scans</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">100%</div>
          <div className="stat-label">EU ESPR Ready</div>
        </div>
      </section>
    </div>
  );
}
