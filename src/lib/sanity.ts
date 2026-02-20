/**
 * Sanity CMS Client Configuration
 * Central data store for Master Products and ILCRs
 */

import { createClient } from '@sanity/client';

// Read-only client (uses CDN in production)
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'demo',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
});

// Write client for mutations (ILCR updates, warehouse intake, etc.)
// Returns null if no API token is configured
export const sanityWriteClient = process.env.SANITY_API_TOKEN
  ? createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'demo',
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
    apiVersion: '2024-01-01',
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
  })
  : null;

// ─── GROQ Queries ──────────────────────────────────────────

export const queries = {
  /** Get all master products */
  allProducts: `*[_type == "masterProduct"] | order(_createdAt desc) {
    _id,
    gtin,
    productName,
    brand,
    category,
    materials,
    compliance,
    sha256Hash,
    _createdAt,
    "ilcrCount": count(*[_type == "ilcr" && references(^._id)])
  }`,

  /** Get a single product by GTIN */
  productByGtin: `*[_type == "masterProduct" && gtin == $gtin][0] {
    ...,
    "ilcrs": *[_type == "ilcr" && references(^._id)] | order(_createdAt desc) {
      _id,
      serialNumber,
      condition,
      lifecycleEvents,
      currentOwner,
      passportPdfUrl,
      qrCodeUrl,
      sha256Hash,
      _createdAt
    }
  }`,

  /** Get a single ILCR by serial number */
  ilcrBySerial: `*[_type == "ilcr" && serialNumber == $serialNumber][0] {
    ...,
    "masterProduct": masterProduct-> {
      gtin,
      productName,
      brand,
      category,
      materials,
      compliance
    }
  }`,

  /** Get all ILCRs for a product */
  ilcrsByProduct: `*[_type == "ilcr" && references($productId)] | order(_createdAt desc) {
    _id,
    serialNumber,
    condition,
    lifecycleEvents,
    currentOwner,
    passportPdfUrl,
    sha256Hash,
    _createdAt
  }`,

  /** Dashboard statistics */
  dashboardStats: `{
    "totalProducts": count(*[_type == "masterProduct"]),
    "totalILCRs": count(*[_type == "ilcr"]),
    "passportsGenerated": count(*[_type == "ilcr" && defined(passportPdfUrl)]),
    "complianceRate": count(*[_type == "masterProduct" && compliance.isCompliant == true]) / count(*[_type == "masterProduct"]) * 100,
    "recentEvents": *[_type == "ilcr"] | order(_createdAt desc) [0..9] {
      serialNumber,
      condition,
      "productName": masterProduct->productName,
      _createdAt
    }
  }`,

  /** Regulatory alerts */
  regulatoryAlerts: `*[_type == "regulatoryAlert"] | order(detectedAt desc) [0..19] {
    _id,
    title,
    severity,
    description,
    sourceUrl,
    schemaImpact,
    detectedAt,
    status
  }`,
};

// ─── Helper Functions ──────────────────────────────────────

export async function fetchProducts() {
  return sanityClient.fetch(queries.allProducts);
}

export async function fetchProductByGtin(gtin: string) {
  return sanityClient.fetch(queries.productByGtin, { gtin });
}

export async function fetchILCRBySerial(serialNumber: string) {
  return sanityClient.fetch(queries.ilcrBySerial, { serialNumber });
}

export async function fetchDashboardStats() {
  return sanityClient.fetch(queries.dashboardStats);
}

export async function createMasterProduct(data: Record<string, unknown>) {
  return sanityClient.create({
    _type: 'masterProduct',
    ...data,
  });
}

export async function createILCR(data: Record<string, unknown>) {
  return sanityClient.create({
    _type: 'ilcr',
    ...data,
  });
}

export async function updateILCR(id: string, data: Record<string, unknown>) {
  return sanityClient.patch(id).set(data).commit();
}

export async function appendLifecycleEvent(
  ilcrId: string,
  event: {
    eventType: string;
    timestamp: string;
    actor: string;
    description: string;
    metadata?: Record<string, unknown>;
    voiceTranscript?: string;
  }
) {
  return sanityClient
    .patch(ilcrId)
    .setIfMissing({ lifecycleEvents: [] })
    .append('lifecycleEvents', [event])
    .commit();
}
