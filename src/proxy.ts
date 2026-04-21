import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieSetOptions = Parameters<NextResponse['cookies']['set']>[2]

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieSetOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Allow webhook endpoints without auth
  if (pathname.startsWith('/api/webhooks')) {
    return supabaseResponse
  }

  // Command Center: require auth
  if (pathname.startsWith('/command-center')) {
    const { data: { user: ccUser } } = await supabase.auth.getUser()
    if (!ccUser) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Not logged in + protected dashboard routes -> login
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged in users on auth routes -> dashboard
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const middleware = proxy

export const config = {
  matcher: ['/dashboard/:path*', '/command-center/:path*', '/login', '/signup', '/forgot-password'],
}
