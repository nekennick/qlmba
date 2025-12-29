"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

// ============ TEAM ACTIONS ============

export async function getTeams() {
    return db.team.findMany({
        include: {
            _count: {
                select: { users: true, dispatches: true },
            },
        },
        orderBy: { code: "asc" },
    })
}

export async function createTeam(data: { name: string; code: string }) {
    const team = await db.team.create({
        data: {
            name: data.name,
            code: data.code.toUpperCase(),
        },
    })
    revalidatePath("/admin")
    return team
}

export async function updateTeam(
    id: string,
    data: { name: string; code: string }
) {
    const team = await db.team.update({
        where: { id },
        data: {
            name: data.name,
            code: data.code.toUpperCase(),
        },
    })
    revalidatePath("/admin")
    return team
}

export async function deleteTeam(id: string) {
    await db.team.delete({ where: { id } })
    revalidatePath("/admin")
}

// ============ USER ACTIONS ============

export async function getUsers() {
    return db.user.findMany({
        include: {
            team: true,
        },
        orderBy: { username: "asc" },
    })
}

export async function createUser(data: {
    username: string
    password: string
    name: string
    role: string
    teamId?: string | null
}) {
    const hashedPassword = await bcrypt.hash(data.password, 10)
    const user = await db.user.create({
        data: {
            username: data.username,
            password: hashedPassword,
            name: data.name,
            role: data.role,
            teamId: data.teamId || null,
        },
    })
    revalidatePath("/admin")
    return user
}

export async function updateUser(
    id: string,
    data: {
        username?: string
        password?: string
        name?: string
        role?: string
        teamId?: string | null
    }
) {
    const updateData: Record<string, unknown> = {}

    if (data.username) updateData.username = data.username
    if (data.name) updateData.name = data.name
    if (data.role) updateData.role = data.role
    if (data.teamId !== undefined) updateData.teamId = data.teamId || null
    if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10)
    }

    const user = await db.user.update({
        where: { id },
        data: updateData,
    })
    revalidatePath("/admin")
    return user
}

export async function deleteUser(id: string) {
    await db.user.delete({ where: { id } })
    revalidatePath("/admin")
}
