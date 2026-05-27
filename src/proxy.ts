import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function hasSupabaseAuthCookie(request: NextRequest) {
    return request.cookies
        .getAll()
        .some(cookie => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'))
}

export async function proxy(request: NextRequest) {
    try {
        const isPublicRoute =
            request.nextUrl.pathname.startsWith('/login') ||
            request.nextUrl.pathname.startsWith('/auth') ||
            request.nextUrl.pathname === '/api/health' ||
            request.nextUrl.pathname.startsWith('/api/debug')
        const hasAuthCookie = hasSupabaseAuthCookie(request)

        let response = NextResponse.next({
            request: {
                headers: request.headers,
            },
        })

        if (!hasAuthCookie) {
            if (isPublicRoute) {
                return response
            }

            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Create Supabase Client compatible with Next.js Proxy
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value }) =>
                                request.cookies.set(name, value)
                            )
                        } catch {
                            // Ignored: modifying request cookies might fail if readonly
                        }

                        // Clone request to ensure cookies are passed down
                        response = NextResponse.next({
                            request,
                        })

                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const {
            data: { user },
        } = await supabase.auth.getUser()

        // Protected Routes Logic
        if (!user && !isPublicRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Redirección centralizada para base de roles
        const ADMIN_EMAILS = ['juan49ers@gmail.com', 'admin@controlhub.com']
        const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase())

        // Si intenta ir a /login ya estando logueado
        if (user && request.nextUrl.pathname.startsWith('/login')) {
            const url = request.nextUrl.clone()
            url.pathname = isAdmin ? '/admin' : '/'
            return NextResponse.redirect(url)
        }

        // Si intenta ir a la home (/) siendo admin, redirigir a /admin
        if (user && request.nextUrl.pathname === '/') {
            if (isAdmin) {
                const url = request.nextUrl.clone()
                url.pathname = '/admin'
                return NextResponse.redirect(url)
            }
        }

        return response

    } catch (e: unknown) {
        const error = e as Error
        console.error("Proxy Crash:", error)
        return NextResponse.json(
            { error: "Proxy Crash", details: error.message || "Unknown error" },
            { status: 500 }
        )
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public assets
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
