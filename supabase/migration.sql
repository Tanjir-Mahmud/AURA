-- ============================================
-- Aura DPP & QR Management System
-- Multi-Tenant Schema Migration
-- Run this in the Supabase SQL Editor
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Brands (Tenants) ────────────────────────
CREATE TABLE IF NOT EXISTS brands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    website TEXT,
    contact_email TEXT NOT NULL,
    industry TEXT DEFAULT 'General',
    plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brands_slug ON brands(slug);

-- ─── Brand Users (Auth Link) ────────────────
CREATE TABLE IF NOT EXISTS brand_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    auth_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brand_users_brand ON brand_users(brand_id);
CREATE INDEX idx_brand_users_email ON brand_users(email);

-- ─── Products ───────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    sku TEXT,
    materials TEXT,
    country_of_origin TEXT,
    weight_grams NUMERIC,
    dimensions TEXT,
    care_instructions TEXT,
    compliance_score NUMERIC DEFAULT 0,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_brand ON products(brand_id);

-- ─── Production Batches ─────────────────────
CREATE TABLE IF NOT EXISTS production_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    qr_generated_count INTEGER DEFAULT 0,
    production_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'shipped')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_brand ON production_batches(brand_id);
CREATE INDEX idx_batches_product ON production_batches(product_id);

-- ─── DPP Codes (one per individual item) ────
CREATE TABLE IF NOT EXISTS dpp_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    serial_number TEXT UNIQUE NOT NULL,
    qr_data TEXT NOT NULL,
    passport_hash TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'returned', 'revoked')),
    scan_count INTEGER DEFAULT 0,
    first_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dpp_serial ON dpp_codes(serial_number);
CREATE INDEX idx_dpp_batch ON dpp_codes(batch_id);
CREATE INDEX idx_dpp_brand ON dpp_codes(brand_id);

-- ─── DPP Scans (every consumer scan) ────────
CREATE TABLE IF NOT EXISTS dpp_scans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dpp_code_id UUID NOT NULL REFERENCES dpp_codes(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    country TEXT,
    city TEXT
);

CREATE INDEX idx_scans_dpp ON dpp_scans(dpp_code_id);
CREATE INDEX idx_scans_brand ON dpp_scans(brand_id);
CREATE INDEX idx_scans_date ON dpp_scans(scanned_at DESC);

-- ─── Suppliers (Private to brand) ───────────
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES production_batches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    contact_email TEXT,
    country TEXT,
    material_supplied TEXT,
    certification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_brand ON suppliers(brand_id);

-- ─── Team Members (Private to brand) ────────
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES production_batches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_brand ON team_members(brand_id);

-- ─── Admin Users ────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    auth_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ─────────────────────
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 1. Brands Isolation
CREATE POLICY "Users can see their own brand" ON brands
    FOR SELECT USING (
        id IN (SELECT brand_id FROM brand_users WHERE auth_user_id = auth.uid())
    );

-- 2. Brand Users Isolation
CREATE POLICY "Users can see teammates" ON brand_users
    FOR SELECT USING (
        brand_id IN (SELECT brand_id FROM brand_users WHERE auth_user_id = auth.uid())
    );

-- 3. Products Isolation
CREATE POLICY "Brands can manage their own products" ON products
    FOR ALL USING (
        brand_id IN (SELECT brand_id FROM brand_users WHERE auth_user_id = auth.uid())
    );

-- 4. Batches Isolation
CREATE POLICY "Brands can manage their own batches" ON production_batches
    FOR ALL USING (
        brand_id IN (SELECT brand_id FROM brand_users WHERE auth_user_id = auth.uid())
    );

-- 5. DPP Codes Isolation
CREATE POLICY "Brands can manage their own DPP codes" ON dpp_codes
    FOR ALL USING (
        brand_id IN (SELECT brand_id FROM brand_users WHERE auth_user_id = auth.uid())
    );

-- 6. Scans Isolation (Dashboard view)
CREATE POLICY "Brands can see their own scans" ON dpp_scans
    FOR SELECT USING (
        brand_id IN (SELECT brand_id FROM brand_users WHERE auth_user_id = auth.uid())
    );

-- 7. Private Data Isolation (Suppliers & Team)
CREATE POLICY "Brands can manage their own suppliers" ON suppliers
    FOR ALL USING (
        brand_id IN (SELECT brand_id FROM brand_users WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "Brands can manage their own team" ON team_members
    FOR ALL USING (
        brand_id IN (SELECT brand_id FROM brand_users WHERE auth_user_id = auth.uid())
    );

-- ─── Public Access (DPP Verification) ───────
CREATE POLICY "Public DPP lookup" ON dpp_codes FOR SELECT USING (true);
CREATE POLICY "Public product lookup" ON products FOR SELECT USING (true);
CREATE POLICY "Public brand lookup" ON brands FOR SELECT USING (true);
CREATE POLICY "Public scan logging" ON dpp_scans FOR INSERT WITH CHECK (true);

-- ─── Helper Functions ────────────────────────
-- Trigger to set updated_at on change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brands_modtime BEFORE UPDATE ON brands FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─── Atomic Scan Counter (RPC) ──────────────
-- Prevents race conditions by atomically incrementing scan_count
-- and setting first_scanned_at on the first scan.
CREATE OR REPLACE FUNCTION increment_scan_count(code_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE dpp_codes
    SET scan_count = scan_count + 1,
        first_scanned_at = COALESCE(first_scanned_at, NOW())
    WHERE id = code_id;
END;
$$ LANGUAGE plpgsql;
