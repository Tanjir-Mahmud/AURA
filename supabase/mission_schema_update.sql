/*
  MISSION RECONCILIATION: AURA Universal Lifecycle Orchestrator
  Updating products table to include specific fields required by the EU ESPR mandate.
*/

-- 1. Create product_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE product_status AS ENUM ('MANUFACTURING', 'RETAIL', 'RECYCLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update products table
-- Keeping existing id, brand_id but ensuring sku and status match the mission specs
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS batch_number TEXT,
ADD COLUMN IF NOT EXISTS status product_status DEFAULT 'MANUFACTURING';

-- Ensure GTIN is mapped to SKU if needed or kept separate. 
-- The mission specifically asks for SKU.
COMMENT ON COLUMN public.products.sku IS 'Product SKU as per internal warehouse tracking';
COMMENT ON COLUMN public.products.status IS 'Current lifecycle status: MANUFACTURING, RETAIL, RECYCLED';
