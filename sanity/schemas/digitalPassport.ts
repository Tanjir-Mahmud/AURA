/**
 * MISSION: DEVELOP AURA - Step 1
 * Sanity Schema for 'digitalPassport'
 * 
 * material_composition (array), origin_factory (string), 
 * carbon_footprint (number), and pdf_url (url)
 */

export const digitalPassportSchema = {
    name: 'digitalPassport',
    title: 'Digital Product Passport (Legal)',
    type: 'document',
    fields: [
        {
            name: 'status',
            title: 'Passport Status',
            type: 'string',
            options: {
                list: [
                    { title: 'Draft', value: 'DRAFT' },
                    { title: 'Published', value: 'PUBLISHED' },
                    { title: 'Archived', value: 'ARCHIVED' }
                ],
            },
            initialValue: 'DRAFT'
        },
        {
            name: 'batch_id',
            title: 'Manufacturing Batch ID',
            type: 'string',
            readOnly: ({ document }: any) => document?.status === 'PUBLISHED',
            validation: (Rule: any) => Rule.required()
        },
        {
            name: 'material_composition',
            title: 'Material Composition',
            type: 'array',
            readOnly: ({ document }: any) => document?.status === 'PUBLISHED',
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
            name: 'origin_factory',
            title: 'Origin Factory',
            type: 'string',
            readOnly: ({ document }: any) => document?.status === 'PUBLISHED',
            description: 'Name and location of the manufacturing facility'
        },
        {
            name: 'carbon_footprint',
            title: 'Carbon Footprint (kg CO2e)',
            type: 'number',
            description: 'Calculated lifecycle carbon impact'
        },
        {
            name: 'change_request_log',
            title: 'Audit Trail / Change Requests',
            type: 'array',
            of: [
                {
                    type: 'object',
                    name: 'supplement',
                    title: 'Supplement Record',
                    fields: [
                        { name: 'date', type: 'datetime', initialValue: (new Date()).toISOString() },
                        { name: 'reason', title: 'Reason for Change', type: 'text' },
                        { name: 'requested_by', type: 'string' },
                        { name: 'data_delta', title: 'Data Supplement', type: 'text', description: 'Describe the additive change here.' }
                    ]
                }
            ],
            description: 'Once published, all edits must be logged here as supplements.'
        },
        {
            name: 'pdf_url',
            title: 'Passport PDF URL (Immutability)',
            type: 'url',
            description: 'Link to the Foxit-generated signed legal passport document'
        }
    ],
    preview: {
        select: {
            title: 'origin_factory',
            subtitle: 'carbon_footprint'
        }
    }
};
