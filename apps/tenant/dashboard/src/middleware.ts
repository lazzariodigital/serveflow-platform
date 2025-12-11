import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ════════════════════════════════════════════════════════════════
// Frontegg Middleware for Multi-Tenant Authentication
// ════════════════════════════════════════════════════════════════
// Each tenant has its own Frontegg environment (baseUrl + clientId)
// Authentication is handled by Frontegg's embedded login within each tenant
// ════════════════════════════════════════════════════════════════

// Public routes - no auth required
const publicRoutes = [
  '/sign-in',
  '/sign-up',
  '/sso-callback',
  '/verify',
  '/api/webhooks',
  '/account/login',
  '/account/logout',
  '/account/callback',
];

// Auth routes - should redirect to home if already logged in
const authRoutes = ['/sign-in', '/sign-up'];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

// ════════════════════════════════════════════════════════════════
// Extract tenant slug from host
// ════════════════════════════════════════════════════════════════
function extractTenantSlug(host: string): string | null {
  // Development: demo.localhost:4200 → demo
  if (host.includes('localhost')) {
    const parts = host.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return parts[0];
    }
    // Fallback to env variable for simple localhost
    return process.env.DEV_TENANT_SLUG || null;
  }

  // Production: gimnasio-demo.serveflow.app → gimnasio-demo
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
// Verify Frontegg Token
// ════════════════════════════════════════════════════════════════
async function verifyFronteggToken(token: string, tenantBaseUrl: string): Promise<{
  valid: boolean;
  userId?: string;
  tenantId?: string;
  email?: string;
}> {
  try {
    // For server-side token verification, we decode the JWT and verify its claims
    // The token is issued by Frontegg and contains tenant-specific claims
    const base64Payload = token.split('.')[1];
    if (!base64Payload) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { valid: false };
    }

    // Verify issuer matches tenant's Frontegg URL
    if (payload.iss && !payload.iss.includes(tenantBaseUrl.replace('https://', ''))) {
      console.warn('[Middleware] Token issuer mismatch');
      return { valid: false };
    }

    return {
      valid: true,
      userId: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
    };
  } catch (error) {
    console.error('[Middleware] Token verification error:', error);
    return { valid: false };
  }
}

// ════════════════════════════════════════════════════════════════
// Middleware
// ════════════════════════════════════════════════════════════════
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ════════════════════════════════════════════════════════════════
  // 1. Extract tenant slug from subdomain
  // ════════════════════════════════════════════════════════════════
  const host = req.headers.get('host') || '';
  const tenantSlug = extractTenantSlug(host);

  // ════════════════════════════════════════════════════════════════
  // 2. Public routes: allow without auth
  // ════════════════════════════════════════════════════════════════
  if (isPublicRoute(pathname)) {
    const response = NextResponse.next();
    if (tenantSlug) {
      response.headers.set('x-tenant-slug', tenantSlug);
    }
    return response;
  }

  // ════════════════════════════════════════════════════════════════
  // 3. Extract Frontegg access token from cookies
  // ════════════════════════════════════════════════════════════════
  // Frontegg stores the access token in a cookie named 'fe_access_token'
  // or in a tenant-specific cookie: 'fe_access_token_{tenantSlug}'
  const accessToken =
    req.cookies.get(`fe_access_token_${tenantSlug}`)?.value ||
    req.cookies.get('fe_access_token')?.value ||
    req.cookies.get('frontegg-access-token')?.value;

  // ════════════════════════════════════════════════════════════════
  // 4. Verify authentication for protected routes
  // ════════════════════════════════════════════════════════════════
  if (!accessToken) {
    // Not authenticated - redirect to sign-in
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Get tenant's Frontegg base URL (will be resolved from DB in layout)
  // For middleware, we do a basic token structure check
  const tenantBaseUrl = process.env.FRONTEGG_BASE_URL || '';

  const tokenResult = await verifyFronteggToken(accessToken, tenantBaseUrl);

  if (!tokenResult.valid) {
    // Invalid token - redirect to sign-in
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // ════════════════════════════════════════════════════════════════
  // 5. Auth routes: redirect to home if already logged in
  // ════════════════════════════════════════════════════════════════
  if (isAuthRoute(pathname) && tokenResult.valid) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // ════════════════════════════════════════════════════════════════
  // 6. Inject context headers for Server Components
  // ════════════════════════════════════════════════════════════════
  const response = NextResponse.next();

  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug);
  }
  if (tokenResult.userId) {
    response.headers.set('x-frontegg-user-id', tokenResult.userId);
  }
  if (tokenResult.tenantId) {
    response.headers.set('x-frontegg-tenant-id', tokenResult.tenantId);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
