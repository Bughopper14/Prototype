import {NextResponse, type NextRequest} from 'next/server';

// Cheap, edge-safe gate: pages need a session cookie. Real validation happens in the server guard / API.
export function middleware(request: NextRequest) {
  if (!request.cookies.has('los_session')) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {matcher: ['/gallery/:path*', '/crm-dashboard/:path*', '/user-management/:path*', '/documents/:path*']};
