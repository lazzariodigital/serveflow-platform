import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  canAccessApp,
  canAccessRoute,
  type DashboardRoute,
  type TenantRole,
} from '@serveflow/authorization/client';

// ════════════════════════════════════════════════════════════════
// FusionAuth Middleware for Tenant WebApp
// ════════════════════════════════════════════════════════════════
// Each tenant has its own FusionAuth tenant + applications
// Authentication is handled via FusionAuth cookies (fa_access_token)
// Authorization checks:
// 1. User's role must have 'webapp' in allowedApps (from tenant_roles)
// 2. User's role must have access to the specific route (from webappConfig)
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
  '/unauthorized',
  // WebApp specific public routes
  '/',
  '/booking',
  '/services',
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
  // Development: demo.app.localhost:3001 → demo
  // Or: demo.localhost:3001 → demo
  if (host.includes('localhost')) {
    const parts = host.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return parts[0];
    }
    // Fallback to env variable for simple localhost
    return process.env.DEV_TENANT_SLUG || null;
  }

  // Production: gimnasio-demo.app.serveflow.app → gimnasio-demo
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
// Fetch tenant_roles from API (for canAccessApp)
// ════════════════════════════════════════════════════════════════
async function fetchTenantRoles(tenantSlug: string): Promise<TenantRole[]> {
  try {
    const apiUrl = process.env.TENANT_SERVER_URL || 'http://localhost:3100';
    const response = await fetch(`${apiUrl}/api/roles/allowed-apps`, {
      headers: {
        'x-tenant-slug': tenantSlug,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.error(`[Middleware] Failed to fetch tenant roles: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.data || []).map((r: { slug: string; allowedApps: string[] }) => ({
      slug: r.slug,
      allowedApps: r.allowedApps,
      isActive: true,
    }));
  } catch (error) {
    console.error('[Middleware] Error fetching tenant roles:', error);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// Fetch webapp config from API (for canAccessRoute)
// ════════════════════════════════════════════════════════════════
async function fetchWebappConfig(tenantSlug: string): Promise<DashboardRoute[]> {
  try {
    const apiUrl = process.env.TENANT_SERVER_URL || 'http://localhost:3100';
    const response = await fetch(`${apiUrl}/api/settings/webapp-config`, {
      headers: {
        'x-tenant-slug': tenantSlug,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.error(`[Middleware] Failed to fetch webapp config: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.data?.routes || [];
  } catch (error) {
    console.error('[Middleware] Error fetching webapp config:', error);
    return [];
  }
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
  const accessToken = req.cookies.get('fa_access_token')?.value;

  // ════════════════════════════════════════════════════════════════
  // 4. Verify authentication for protected routes
  // ════════════════════════════════════════════════════════════════
  if (!accessToken) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  const tokenResult = await verifyFusionAuthToken(accessToken);

  if (!tokenResult.valid) {
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

  const userRoles = tokenResult.roles || [];

  // ════════════════════════════════════════════════════════════════
  // 6. AUTHORIZATION: Check if user can access WebApp
  // ════════════════════════════════════════════════════════════════
  // Load tenant_roles from API and check allowedApps
  if (!tenantSlug) {
    console.error('[Middleware] No tenant slug - cannot authorize');
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  const tenantRoles = await fetchTenantRoles(tenantSlug);

  if (!canAccessApp(userRoles, 'webapp', tenantRoles)) {
    console.warn(
      `[Middleware] WebApp access denied: user ${tokenResult.email} with roles [${userRoles.join(', ')}] cannot access webapp`
    );
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  // ════════════════════════════════════════════════════════════════
  // 7. AUTHORIZATION: Check route access based on roles
  // ════════════════════════════════════════════════════════════════
  // Load tenant webapp_config from API
  const routes: DashboardRoute[] = await fetchWebappConfig(tenantSlug);

  if (!canAccessRoute(pathname, userRoles, routes)) {
    console.warn(
      `[Middleware] Route access denied: user ${tokenResult.email} with roles [${userRoles.join(', ')}] cannot access ${pathname}`
    );
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  // ════════════════════════════════════════════════════════════════
  // 8. Inject context headers for Server Components
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
  if (tokenResult.roles) {
    response.headers.set('x-user-roles', JSON.stringify(tokenResult.roles));
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
