import { NextRequest, NextResponse } from 'next/server';
import { registerBrand } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { brandName, email, password, industry } = body;

        if (!brandName || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Execute registration securely on the server
        const result = await registerBrand({ brandName, email, password, industry });

        return NextResponse.json({
            success: true,
            brand: result.brand,
            user: {
                id: result.user.id,
                email: result.user.email
            }
        });
    } catch (error: any) {
        console.error('[API Register Brand] Error:', error);
        return NextResponse.json({
            error: error.message || 'Registration failed'
        }, { status: 400 });
    }
}
