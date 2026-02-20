import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { Brand, Product, ProductionBatch, DPPCode, DPPScan } from './supabase-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Client-Side Supabase Client (Standard)
 */
export const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : null as any;

/**
 * Server-Side Supabase Client (Middleware/Server Components)
 */
export function createSupabaseServerClient(cookieStore: any) {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch {
                    // This can be ignored if called from a Server Component
                }
            },
        },
    });
}

/**
 * Service Role Client (Administrative Operations)
 */
export function getServiceSupabase() {
    if (!supabaseServiceKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) return supabase;
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

// ═══════════════════════════════════════════════
// Auth & Onboarding
// ═══════════════════════════════════════════════

export async function registerBrand({ brandName, industry, email, password }: any) {
    const sb = getServiceSupabase();

    // 1. Create Supabase Auth User using ADMIN privileges
    // This bypasses public rate limits and skips the need for email confirmation
    const { data: auth, error: aErr } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { brand_name: brandName }
    });

    if (aErr) throw aErr;
    if (!auth.user) throw new Error('Registration failed: User could not be created administratively.');

    const slug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    try {
        // 2. Create Brand record using service role
        const { data: brand, error: bErr } = await sb
            .from('brands')
            .insert([{
                name: brandName,
                slug,
                contact_email: email,
                industry,
                plan: 'starter'
            }])
            .select()
            .single();

        if (bErr) throw bErr;

        // 3. Link Auth User to Brand Profile
        const { error: luErr } = await sb
            .from('brand_users')
            .insert([{
                brand_id: brand.id,
                email,
                full_name: brandName,
                auth_user_id: auth.user.id,
                role: 'owner'
            }]);

        if (luErr) throw luErr;

        return { brand, user: auth.user };
    } catch (err) {
        // Note: In a production app, you might want to rollback the auth user here
        // but for now we throw and let the UI handle the error message
        throw err;
    }
}

export async function getBrandForUser(authUserId: string): Promise<Brand | null> {
    const { data, error } = await supabase
        .from('brand_users')
        .select('brands(*)')
        .eq('auth_user_id', authUserId)
        .single();

    if (error || !data) return null;
    return (data.brands as unknown) as Brand;
}

// ═══════════════════════════════════════════════
// Brand Helpers
// ═══════════════════════════════════════════════

export async function getAllBrands(): Promise<Brand[]> {
    const { data, error } = await supabase
        .from('brands').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (error) { console.error('[Supabase] Brands fetch error:', error.message); return []; }
    return (data || []) as Brand[];
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
    const { data, error } = await supabase
        .from('brands').select('*').eq('slug', slug).single();
    if (error) return null;
    return data as Brand;
}

// ═══════════════════════════════════════════════
// Product Helpers
// ═══════════════════════════════════════════════

export async function getProductsByBrand(brandId: string): Promise<Product[]> {
    const { data, error } = await supabase
        .from('products').select('*').eq('brand_id', brandId).order('created_at', { ascending: false });
    if (error) { console.error('[Supabase] Products fetch error:', error.message); return []; }
    return (data || []) as Product[];
}

export async function createProduct(product: Partial<Product>): Promise<Product | null> {
    const { data, error } = await supabase.from('products').insert(product).select().single();
    if (error) { console.error('[Supabase] Product create error:', error.message); return null; }
    return data as Product;
}

// ═══════════════════════════════════════════════
// Batch Helpers
// ═══════════════════════════════════════════════

export async function getBatchesByBrand(brandId: string): Promise<ProductionBatch[]> {
    const { data, error } = await supabase
        .from('production_batches').select('*, product:products(*)').eq('brand_id', brandId)
        .order('created_at', { ascending: false });
    if (error) { console.error('[Supabase] Batches fetch error:', error.message); return []; }
    return (data || []) as ProductionBatch[];
}

export async function createBatch(batch: Partial<ProductionBatch>): Promise<ProductionBatch | null> {
    const { data, error } = await supabase.from('production_batches').insert(batch).select().single();
    if (error) { console.error('[Supabase] Batch create error:', error.message); return null; }
    return data as ProductionBatch;
}

export async function updateBatchStatus(batchId: string, status: string, qrCount: number) {
    const db = getServiceSupabase();
    await db.from('production_batches')
        .update({ status, qr_generated_count: qrCount })
        .eq('id', batchId);
}

// ═══════════════════════════════════════════════
// DPP Code Helpers
// ═══════════════════════════════════════════════

export async function insertDPPCodes(codes: Partial<DPPCode>[]): Promise<DPPCode[]> {
    const db = getServiceSupabase();
    const { data, error } = await db.from('dpp_codes').insert(codes).select();
    if (error) { console.error('[Supabase] DPP insert error:', error.message); return []; }
    return (data || []) as DPPCode[];
}

export async function getDPPBySerial(serial: string): Promise<DPPCode | null> {
    const { data, error } = await supabase
        .from('dpp_codes')
        .select('*, product:products(*), brand:brands(*), batch:production_batches(*)')
        .eq('serial_number', serial).single();
    if (error) return null;
    return data as DPPCode;
}

// ═══════════════════════════════════════════════
// Scan Analytics
// ═══════════════════════════════════════════════

export async function recordScan(scan: Partial<DPPScan>) {
    const db = getServiceSupabase();
    const { data, error } = await db.from('dpp_scans').insert(scan).select().single();

    // Atomic increment: use RPC to avoid TOCTOU race condition
    if (scan.dpp_code_id) {
        await db.rpc('increment_scan_count', { code_id: scan.dpp_code_id });
    }
    return data;
}

export async function updateScanFitScore(scanId: string, fitScore: number) {
    const db = getServiceSupabase();
    await db.from('dpp_scans').update({ fit_score: fitScore }).eq('id', scanId);
}

export async function getScansByBrand(brandId: string, days = 30): Promise<DPPScan[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('dpp_scans').select('*').eq('brand_id', brandId)
        .gte('scanned_at', since).order('scanned_at', { ascending: false });
    if (error) return [];
    return (data || []) as DPPScan[];
}

// ═══════════════════════════════════════════════
// Admin Metrics
// ═══════════════════════════════════════════════

export async function getAdminMetrics() {
    const db = getServiceSupabase();
    const [brands, dppCodes, scans] = await Promise.all([
        db.from('brands').select('id, name, slug, plan, created_at', { count: 'exact' }),
        db.from('dpp_codes').select('brand_id', { count: 'exact' }),
        db.from('dpp_scans').select('brand_id', { count: 'exact' }),
    ]);
    return {
        totalBrands: brands.count || 0,
        totalDPPs: dppCodes.count || 0,
        totalScans: scans.count || 0,
        brands: brands.data || [],
    };
}

/**
 * Check if an authenticated user is a platform admin
 */
export async function isAdminUser(authUserId: string): Promise<boolean> {
    const db = getServiceSupabase();
    const { data, error } = await db
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single();
    return !error && !!data;
}
