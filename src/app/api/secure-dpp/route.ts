import { NextRequest, NextResponse } from 'next/server';
import { verifyQrSignature } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

/**
 * MISSION: SECURE REDIRECTOR
 * Logic to prevent database scraping and URL enumeration.
 */

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const sig = searchParams.get('sig');

    if (!id || !sig) {
        return NextResponse.json({ error: 'Invalid AURA secure link' }, { status: 400 });
    }

    // Verify cryptographic salt signature
    const isValid = verifyQrSignature(id, sig);

    if (!isValid) {
        console.warn(`[Security] Counterfeit QR detected for Product: ${id}`);
        return NextResponse.redirect(new URL('/auth/login?error=counterfeit', req.url));
    }

    // Authorized redirect to product verification page
    return NextResponse.redirect(new URL(`/verify/${id}`, req.url));
}
