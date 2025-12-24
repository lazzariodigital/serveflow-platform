import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ════════════════════════════════════════════════════════════════
// FusionAuth Middleware for Admin Dashboard
// ════════════════════════════════════════════════════════════════
// NO tenant resolution - uses fixed FusionAuth Tenant ID
// ONLY superadmin role can access this dashboard
// ════════════════════════════════════════════════════════════════

// Public routes - no auth required
const publicRoutes = [
  '/sign-in',
  '/api/webhooks',
  '/account/login',
  '/account/logout',
  '/account/callback',
  '/unauthorized',
];

// Auth routes - should redirect to home if already logged in
const authRoutes = ['/sign-in'];

// Required role for admin dashboard
const REQUIRED_ROLE = 'superadmin';

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
// Verify FusionAuth Token (basic validation in middleware)
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
    const base64Payload = token.split('.')[1];
    if (!base64Payload) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { valid: false };
    }

    // Verify this is for the admin tenant
    const adminTenantId = process.env.FUSIONAUTH_ADMIN_TENANT_ID;
    if (adminTenantId && payload.tid !== adminTenantId) {
      console.warn('[Middleware] Token is not for admin tenant');
      return { valid: false };
    }

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

  // 1. Public routes: allow without auth
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 2. Extract FusionAuth access token from cookies
  const accessToken = req.cookies.get('fa_access_token')?.value;

  // 3. Verify authentication for protected routes
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

  // 4. Auth routes: redirect to home if already logged in
  if (isAuthRoute(pathname) && tokenResult.valid) {
    return NextResponse.redirect(new URL('/tenants', req.url));
  }

  // ════════════════════════════════════════════════════════════════
  // 5. AUTHORIZATION: Verify user has superadmin role
  // ════════════════════════════════════════════════════════════════
  const userRoles = tokenResult.roles || [];
  if (!userRoles.includes(REQUIRED_ROLE)) {
    console.warn(
      `[Middleware] Access denied: user ${tokenResult.email} does not have ${REQUIRED_ROLE} role. Roles: ${userRoles.join(', ')}`
    );
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  // 6. Inject context headers for Server Components
  const response = NextResponse.next();

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
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
