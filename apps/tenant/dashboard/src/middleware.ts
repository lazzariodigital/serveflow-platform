import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ════════════════════════════════════════════════════════════════
// FusionAuth Middleware for Multi-Tenant Authentication
// ════════════════════════════════════════════════════════════════
// Each tenant has its own FusionAuth tenant + application
// Authentication is handled via FusionAuth cookies (fa_access_token)
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
// Verify FusionAuth Token (basic validation in middleware)
// Full JWKS verification happens in the backend guard
// ════════════════════════════════════════════════════════════════
async function verifyFusionAuthToken(token: string): Promise<{
  valid: boolean;
  userId?: string;
  tenantId?: string;
  applicationId?: string;
  email?: string;
  roles?: string[];
}> {
  try {
    // Decode JWT payload (signature verification done in backend)
    const base64Payload = token.split('.')[1];
    if (!base64Payload) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { valid: false };
    }

    // FusionAuth JWT claims:
    // sub = user ID
    // aud = application ID
    // tid = tenant ID (if multi-tenant)
    // roles = user roles from registration

    return {
      valid: true,
      userId: payload.sub,
      tenantId: payload.tid,
      applicationId: payload.aud,
      email: payload.email,
      roles: payload.roles || [],
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
  // 3. Extract FusionAuth access token from cookies
  // ════════════════════════════════════════════════════════════════
  // FusionAuth token stored in cookie 'fa_access_token'
  const accessToken =
    req.cookies.get('fa_access_token')?.value;

  // ════════════════════════════════════════════════════════════════
  // 4. Verify authentication for protected routes
  // ════════════════════════════════════════════════════════════════
  if (!accessToken) {
    // Not authenticated - redirect to sign-in
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Basic token structure check in middleware
  // Full JWKS verification happens in the backend FusionAuthGuard
  const tokenResult = await verifyFusionAuthToken(accessToken);

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
    response.headers.set('x-fusionauth-user-id', tokenResult.userId);
  }
  if (tokenResult.tenantId) {
    response.headers.set('x-fusionauth-tenant-id', tokenResult.tenantId);
  }
  if (tokenResult.applicationId) {
    response.headers.set('x-fusionauth-application-id', tokenResult.applicationId);
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
