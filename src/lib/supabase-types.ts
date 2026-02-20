/**
 * Supabase Database Types — Aura DPP & QR Management System
 */

export interface Brand {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    website: string | null;
    contact_email: string;
    industry: string;
    plan: 'starter' | 'pro' | 'enterprise';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface BrandUser {
    id: string;
    brand_id: string;
    email: string;
    full_name: string;
    role: 'owner' | 'admin' | 'member';
    auth_user_id: string | null;
    created_at: string;
}

export interface Product {
    id: string;
    brand_id: string;
    name: string;
    description: string | null;
    category: string;
    sku: string | null;
    materials: string | null;
    country_of_origin: string | null;
    weight_grams: number | null;
    dimensions: string | null;
    care_instructions: string | null;
    compliance_score: number;
    regulatory_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    intelligence_data: Record<string, any>;
    custom_fields: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface ProductionBatch {
    id: string;
    brand_id: string;
    product_id: string;
    batch_number: string;
    quantity: number;
    qr_generated_count: number;
    production_date: string;
    status: 'pending' | 'generating' | 'completed' | 'shipped';
    notes: string | null;
    created_at: string;
    // Joined fields
    product?: Product;
}

export interface DPPCode {
    id: string;
    batch_id: string;
    brand_id: string;
    product_id: string;
    serial_number: string;
    qr_data: string;
    passport_hash: string | null;
    status: 'active' | 'sold' | 'returned' | 'revoked';
    scan_count: number;
    first_scanned_at: string | null;
    created_at: string;
    // Joined fields
    product?: Product;
    brand?: Brand;
    batch?: ProductionBatch;
}

export interface DPPScan {
    id: string;
    dpp_code_id: string;
    brand_id: string;
    scanned_at: string;
    ip_address: string | null;
    user_agent: string | null;
    country: string | null;
    city: string | null;
    fit_score: number | null; // Added for Feature 2
}

export interface Supplier {
    id: string;
    brand_id: string;
    batch_id: string | null;
    name: string;
    contact_email: string | null;
    country: string | null;
    material_supplied: string | null;
    certification: string | null;
    created_at: string;
}

export interface TeamMember {
    id: string;
    brand_id: string;
    batch_id: string | null;
    name: string;
    role: string;
    department: string | null;
    created_at: string;
}

export interface AdminUser {
    id: string;
    email: string;
    full_name: string;
    auth_user_id: string | null;
    created_at: string;
}
