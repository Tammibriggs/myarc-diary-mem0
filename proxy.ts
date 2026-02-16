import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isOnboarded = token?.isOnboarded;
        const { pathname } = req.nextUrl;

        const isAuthPage = pathname.startsWith("/auth");
        const isOnboardingPage = pathname.startsWith("/onboarding");

        // 1. If user is onboarded, don't let them back into Auth or Onboarding
        if ((isAuthPage || isOnboardingPage) && isOnboarded) {
            return NextResponse.redirect(new URL("/", req.url));
        }

        // 2. If user is AUTHENTICATED but NOT onboarded, force them to onboarding
        // (unless they are already on the onboarding page or the auth page)
        if (token && !isOnboarded && !isOnboardingPage && !isAuthPage) {
            const searchParams = new URLSearchParams({ callbackUrl: pathname });
            return NextResponse.redirect(new URL(`/onboarding?${searchParams.toString()}`, req.url));
        }

        // 3. In all other cases (including accessing deep links while onboarded), 
        // just let them through to their intended destination.
    },
    {
        callbacks: {
            // We return true for the auth page so the middleware function can handle the redirect logic
            authorized: ({ token, req }) => {
                const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
                if (isAuthPage) return true;
                return !!token;
            },
        },
    }
)

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)"] }
