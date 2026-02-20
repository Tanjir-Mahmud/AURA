/**
 * MISSION: DATA INTEGRITY ENGINE
 * Sanity Schema for 'dpp' (Digital Product Passport)
 * 
 * This schema enforces strict immutability for core manufacturing data.
 * Once the status is 'published' or 'verified', the birth-data is locked.
 */

export const dppSchema = {
    name: 'dpp',
    title: 'Digital Product Passport (Legal)',
    type: 'document',
    fields: [
        {
            name: 'status',
            title: 'Passport Status',
            type: 'string',
            options: {
                list: [
                    { title: 'Draft', value: 'draft' },
                    { title: 'Published', value: 'published' },
                    { title: 'Verified', value: 'verified' }
                ],
            },
            initialValue: 'draft'
        },
        {
            name: 'material_composition',
            title: 'Material Composition',
            type: 'array',
            readOnly: ({ document }: any) => ['published', 'verified'].includes(document?.status),
            of: [
                {
                    type: 'object',
                    fields: [
                        { name: 'material', title: 'Material Name', type: 'string' },
                        { name: 'percentage', title: 'Percentage (%)', type: 'number' },
                    ]
                }
            ],
            description: 'Bill of Materials as per EU labeling requirements'
        },
        {
            name: 'factory_id',
            title: 'Factory ID',
            type: 'string',
            readOnly: ({ document }: any) => ['published', 'verified'].includes(document?.status),
            description: 'Unique identifier for the manufacturing facility'
        },
        {
            name: 'carbon_footprint',
            title: 'Carbon Footprint (kg CO2e)',
            type: 'number',
            readOnly: ({ document }: any) => ['published', 'verified'].includes(document?.status),
            description: 'Calculated lifecycle carbon impact'
        },
        {
            name: 'auditTrail',
            title: 'Audit Trail (Lifecycle Updates)',
            type: 'array',
            of: [
                {
                    type: 'object',
                    name: 'update',
                    title: 'Lifecycle Update',
                    fields: [
                        { name: 'date', type: 'datetime', initialValue: (new Date()).toISOString() },
                        { name: 'event', title: 'Event Type', type: 'string', options: { list: ['Repair', 'Maintenance', 'Resale', 'Recycle'] } },
                        { name: 'description', title: 'Event Details', type: 'text' },
                        { name: 'authorized_by', type: 'string' }
                    ]
                }
            ],
            description: 'Non-destructive updates added after publication (e.g., Repaired on [Date]).'
        }
    ],
    preview: {
        select: {
            title: 'factory_id',
            subtitle: 'status'
        }
    }
};
