import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers }
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers }
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Let public assets and api notifications pass without auth check
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/midtrans/notification') ||
    path.includes('.') ||
    path === '/favicon.ico'
  ) {
    return response;
  }

  // Check login state
  if (!user) {
    // If not logged in and trying to access protected routes, redirect to /login
    const isPublic = 
      path === '/login' || 
      path === '/register' || 
      path === '/' || 
      path.startsWith('/produk') ||
      path.startsWith('/api');

    if (!isPublic) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // If logged in
  const role = user.user_metadata?.role || 'customer';

  // Prevent logged in user from accessing /login and /register
  if (path === '/login' || path === '/register') {
    const redirectUrl = request.nextUrl.clone();
    if (role === 'admin') {
      redirectUrl.pathname = '/admin/dashboard';
    } else if (role === 'petani') {
      redirectUrl.pathname = '/dashboard';
    } else {
      redirectUrl.pathname = '/';
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Check route permissions based on role
  if (role === 'admin') {
    // Admin can only access /admin routes and /api routes
    if (!path.startsWith('/admin') && !path.startsWith('/api')) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
  } else if (role === 'petani') {
    // Petani can access /dashboard, /produk, /pesanan, /chat, /saldo, /profil, /api
    const allowedPetani = 
      path.startsWith('/dashboard') ||
      path.startsWith('/produk') ||
      path.startsWith('/pesanan') ||
      path.startsWith('/chat') ||
      path.startsWith('/saldo') ||
      path.startsWith('/profil') ||
      path.startsWith('/api');

    if (!allowedPetani) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
  } else {
    // Customer can access /, /produk, /keranjang, /pesanan, /chat, /profil, /api
    const forbiddenCustomer = 
      path.startsWith('/dashboard') ||
      path.startsWith('/saldo') ||
      path.startsWith('/admin');

    if (forbiddenCustomer) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
