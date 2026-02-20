/**
 * Sanity Schema: Individual Life Cycle Record (ILCR)
 * 
 * Represents a single physical unit of a product (by serial number).
 * Tracks its entire lifecycle from manufacture to disposal.
 */

export const ilcrSchema = {
    name: 'ilcr',
    title: 'Individual Life Cycle Record',
    type: 'document',
    fields: [
        {
            name: 'serialNumber',
            title: 'Serial Number',
            type: 'string',
            validation: (Rule: { required: () => { (): unknown; new(): unknown; unique: () => unknown } }) => Rule.required().unique(),
            description: 'Unique identifier for this specific product unit',
        },
        {
            name: 'masterProduct',
            title: 'Master Product',
            type: 'reference',
            to: [{ type: 'masterProduct' }],
            validation: (Rule: { required: () => unknown }) => Rule.required(),
        },
        {
            name: 'condition',
            title: 'Current Condition',
            type: 'string',
            options: {
                list: [
                    { title: 'New', value: 'new' },
                    { title: 'Used - Like New', value: 'used_like_new' },
                    { title: 'Used - Good', value: 'used_good' },
                    { title: 'Used - Fair', value: 'used_fair' },
                    { title: 'Refurbished', value: 'refurbished' },
                    { title: 'Damaged', value: 'damaged' },
                    { title: 'End of Life', value: 'end_of_life' },
                ],
            },
            initialValue: 'new',
        },
        {
            name: 'lifecycleEvents',
            title: 'Lifecycle Events',
            type: 'array',
            of: [
                {
                    type: 'object',
                    fields: [
                        {
                            name: 'eventType',
                            title: 'Event Type',
                            type: 'string',
                            options: {
                                list: [
                                    'manufacture', 'quality_check', 'ship', 'warehouse_intake',
                                    'sell', 'return', 'repair', 'refurbish', 'resell',
                                    'recycle', 'dispose',
                                ],
                            },
                        },
                        { name: 'timestamp', title: 'Timestamp', type: 'datetime' },
                        { name: 'actor', title: 'Actor / Operator', type: 'string' },
                        { name: 'description', title: 'Description', type: 'text' },
                        { name: 'location', title: 'Location', type: 'string' },
                        { name: 'voiceTranscript', title: 'Voice Transcript (Deepgram)', type: 'text' },
                        {
                            name: 'metadata',
                            title: 'Additional Metadata',
                            type: 'object',
                            fields: [
                                { name: 'temperature', title: 'Temperature (°C)', type: 'number' },
                                { name: 'humidity', title: 'Humidity (%)', type: 'number' },
                                { name: 'notes', title: 'Notes', type: 'text' },
                            ],
                        },
                    ],
                    preview: {
                        select: {
                            title: 'eventType',
                            subtitle: 'timestamp',
                        },
                    },
                },
            ],
        },
        {
            name: 'currentOwner',
            title: 'Current Owner',
            type: 'string',
        },
        {
            name: 'passportPdfUrl',
            title: 'Passport PDF URL',
            type: 'url',
            description: 'URL to the generated GS1-compliant DPP PDF',
        },
        {
            name: 'qrCodeUrl',
            title: 'QR Code URL',
            type: 'url',
            description: 'URL to the QR code image for this passport',
        },
        {
            name: 'fitScore',
            title: 'Verified Fit Score',
            type: 'object',
            fields: [
                { name: 'score', title: 'Score (0-100)', type: 'number' },
                { name: 'recommendedSize', title: 'Recommended Size', type: 'string' },
                { name: 'confidence', title: 'Confidence Level', type: 'number' },
                { name: 'lastCalculated', title: 'Last Calculated', type: 'datetime' },
            ],
        },
        {
            name: 'sha256Hash',
            title: 'Data Integrity Hash',
            type: 'string',
            readOnly: true,
        },
    ],
    preview: {
        select: {
            title: 'serialNumber',
            subtitle: 'condition',
        },
    },
};
