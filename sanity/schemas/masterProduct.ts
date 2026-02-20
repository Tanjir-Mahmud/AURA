/**
 * Sanity Schema: Master Product
 * 
 * Represents a product SKU with GTIN, materials, and EU ESPR compliance fields.
 * Each Master Product can have many ILCRs (Individual Life Cycle Records).
 */

export const masterProductSchema = {
    name: 'masterProduct',
    title: 'Master Product',
    type: 'document',
    fields: [
        {
            name: 'gtin',
            title: 'GTIN (Global Trade Item Number)',
            type: 'string',
            validation: (Rule: { required: () => { (): unknown; new(): unknown; unique: () => unknown } }) => Rule.required().unique(),
            description: 'GS1 barcode number — must be unique',
        },
        {
            name: 'productName',
            title: 'Product Name',
            type: 'string',
            validation: (Rule: { required: () => unknown }) => Rule.required(),
        },
        {
            name: 'brand',
            title: 'Brand',
            type: 'string',
            validation: (Rule: { required: () => unknown }) => Rule.required(),
        },
        {
            name: 'category',
            title: 'Category',
            type: 'string',
            options: {
                list: [
                    'Textiles & Apparel',
                    'Electronics',
                    'Batteries',
                    'Furniture',
                    'Construction Materials',
                    'Chemicals',
                    'Packaging',
                    'Other',
                ],
            },
        },
        {
            name: 'materials',
            title: 'Materials / Bill of Materials',
            type: 'object',
            fields: [
                { name: 'composition', title: 'Composition', type: 'text' },
                { name: 'recycledContent', title: 'Recycled Content (%)', type: 'number' },
                { name: 'hazardousSubstances', title: 'Hazardous Substances', type: 'array', of: [{ type: 'string' }] },
                { name: 'weight', title: 'Weight (kg)', type: 'number' },
                { name: 'originCountry', title: 'Country of Origin', type: 'string' },
            ],
        },
        {
            name: 'compliance',
            title: 'EU ESPR Compliance',
            type: 'object',
            fields: [
                { name: 'isCompliant', title: 'Is Compliant', type: 'boolean', initialValue: false },
                { name: 'carbonFootprint', title: 'Carbon Footprint (kg CO₂e)', type: 'number' },
                { name: 'energyClass', title: 'Energy Class', type: 'string' },
                { name: 'repairabilityScore', title: 'Repairability Score (0-10)', type: 'number' },
                { name: 'durabilityYears', title: 'Expected Durability (Years)', type: 'number' },
                { name: 'recyclingInstructions', title: 'Recycling Instructions', type: 'text' },
                { name: 'lastAuditDate', title: 'Last Audit Date', type: 'datetime' },
                { name: 'certifications', title: 'Certifications', type: 'array', of: [{ type: 'string' }] },
            ],
        },
        {
            name: 'dimensions',
            title: 'Dimensions',
            type: 'object',
            fields: [
                { name: 'sizeChart', title: 'Size Chart', type: 'text' },
                { name: 'availableSizes', title: 'Available Sizes', type: 'array', of: [{ type: 'string' }] },
                { name: 'fitType', title: 'Fit Type', type: 'string', options: { list: ['Slim', 'Regular', 'Relaxed', 'Oversized'] } },
            ],
        },
        {
            name: 'sha256Hash',
            title: 'Data Integrity Hash',
            type: 'string',
            readOnly: true,
            description: 'SHA-256 hash of all critical product fields — auto-generated',
        },
        {
            name: 'images',
            title: 'Product Images',
            type: 'array',
            of: [{ type: 'image', options: { hotspot: true } }],
        },
    ],
    preview: {
        select: {
            title: 'productName',
            subtitle: 'gtin',
            media: 'images.0',
        },
    },
};
