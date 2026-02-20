/**
 * Fit Score API Route
 * POST: calculates Verified Fit Score via Perfect Corp AI
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyFit } from '@/agents/fitAgent';

export async function POST(request: NextRequest) {
    try {
        // Auth: middleware injects x-auth-user-id for protected routes
        const authUserId = request.headers.get('x-auth-user-id');
        if (!authUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { bodyMeasurements, productSpecs } = body;

        if (!bodyMeasurements || !productSpecs) {
            return NextResponse.json(
                { error: 'Body measurements and product specs required' },
                { status: 400 }
            );
        }

        const result = await verifyFit(bodyMeasurements, productSpecs);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Fit score calculation failed' },
            { status: 500 }
        );
    }
}
