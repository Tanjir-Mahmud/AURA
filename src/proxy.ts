import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// API routes that require authentication
const PROTECTED_API_ROUTES = [
    '/api/generate-dpp',
    '/api/generate-passport',
    '/api/voice-entry',
    '/api/fit-score',
    '/api/regulatory-check',
];

// API routes accessible without authentication
const PUBLIC_API_ROUTES = [
    '/api/verify-dpp',
    '/api/health',
    '/api/auth/register-brand',
];

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('[Middleware] Missing Supabase environment variables');
            return response;
        }

        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        });

        const { data: { user } } = await supabase.auth.getUser();
        const { pathname } = request.nextUrl;

        // ─── Public routes — no auth needed ───
        if (
            pathname === '/' ||
            pathname.includes('/auth/') ||
            pathname.startsWith('/verify/') ||
            pathname.startsWith('/_next/') ||
            pathname.startsWith('/favicon') ||
            PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
        ) {
            return response;
        }

        // ─── Protected Dashboard: /business/* ───
        if (pathname.startsWith('/business')) {
            if (!user) {
                return NextResponse.redirect(new URL('/auth/login?role=brand', request.url));
            }
            return response;
        }

        // ─── Protected Dashboard: /admin/* ───
        if (pathname.startsWith('/admin')) {
            if (!user) {
                return NextResponse.redirect(new URL('/auth/login?role=admin', request.url));
            }

            // Verify the user is in the admin_users table
            const { data: admin } = await supabase
                .from('admin_users')
                .select('id')
                .eq('auth_user_id', user.id)
                .single();

            if (!admin) {
                return NextResponse.redirect(new URL('/', request.url));
            }

            return response;
        }

        // ─── Protected API Routes ───
        if (PROTECTED_API_ROUTES.some(route => pathname.startsWith(route))) {
            if (!user) {
                return NextResponse.json(
                    { error: `Unauthorized — [${pathname}] valid authentication required` },
                    { status: 401 }
                );
            }

            response.headers.set('x-auth-user-id', user.id);
            return response;
        }

        return response;
    } catch (e) {
        console.error('[Middleware] Error:', e);
        return response;
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
