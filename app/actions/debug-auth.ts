"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function debugAuth() {
    const session = await auth()

    if (!session?.user) {
        return { error: "Not authenticated", session: null }
    }

    // Get user from database to verify teamId
    const dbUser = await db.user.findUnique({
        where: { id: session.user.id },
        include: { team: true }
    })

    return {
        sessionUser: session.user,
        dbUser: dbUser ? {
            id: dbUser.id,
            username: dbUser.username,
            role: dbUser.role,
            teamId: dbUser.teamId,
            teamCode: dbUser.team?.code,
            teamName: dbUser.team?.name
        } : null
    }
}
