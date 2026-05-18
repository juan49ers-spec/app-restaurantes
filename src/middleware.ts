import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // Debug Log (Server side)
    // console.log("Middleware running for:", request.nextUrl.pathname)

    try {
        let response = NextResponse.next({
            request: {
                headers: request.headers,
            },
        })

        // Create Supabase Client compatible with Next.js Middleware
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
        if (!user &&
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/auth')
        ) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Redirección centralizada para base de roles
        const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
        const isAdmin = user?.email && adminEmails.includes(user.email.trim().toLowerCase())

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
        console.error("Middleware error:", e instanceof Error ? e.message : "Unknown")
        return NextResponse.json(
            { error: "Internal server error" },
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
