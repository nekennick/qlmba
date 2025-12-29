import NextAuth from "next-auth"

declare module "next-auth" {
    interface User {
        id: string
        username: string
        name: string
        role: string
        teamId: string | null
        teamName: string | null
        teamCode: string | null
    }

    interface Session {
        user: User
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        username: string
        role: string
        teamId: string | null
        teamName: string | null
        teamCode: string | null
    }
}
