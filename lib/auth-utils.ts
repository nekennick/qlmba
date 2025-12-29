import { auth } from "@/auth"

export async function getSession() {
    const session = await auth()
    return session
}

export async function getCurrentUser() {
    const session = await auth()
    if (!session?.user) {
        return null
    }
    return session.user
}

export async function getTeamId() {
    const session = await auth()
    if (!session?.user) {
        return null
    }
    // Admin can see all, returns null to indicate no filtering
    if (session.user.role === "ADMIN") {
        return null
    }
    return session.user.teamId
}

export async function isAdmin() {
    const session = await auth()
    return session?.user?.role === "ADMIN"
}

export async function requireAuth() {
    const session = await auth()
    if (!session?.user) {
        throw new Error("Unauthorized")
    }
    return session.user
}
