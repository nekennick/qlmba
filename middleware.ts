import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth

    // Public routes that don't require authentication
    const publicRoutes = ["/login"]
    const isPublicRoute = publicRoutes.includes(nextUrl.pathname)

    // API routes for auth
    const isAuthRoute = nextUrl.pathname.startsWith("/api/auth")

    if (isAuthRoute) {
        return NextResponse.next()
    }

    if (isPublicRoute) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/dashboard", nextUrl))
        }
        return NextResponse.next()
    }

    if (!isLoggedIn) {
        return NextResponse.redirect(new URL("/login", nextUrl))
    }

    // Check admin routes
    const adminRoutes = ["/admin"]
    const isAdminRoute = adminRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
    )

    if (isAdminRoute && req.auth?.user?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)"],
}
