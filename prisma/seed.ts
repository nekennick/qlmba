import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function removeAccents(str: string) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

async function main() {
    console.log("🌱 Seeding database...")

    // 1. Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10)
    const adminAddress = await prisma.user.upsert({
        where: { username: "admin" },
        update: {},
        create: {
            username: "admin",
            password: adminPassword,
            name: "Quản trị viên",
            role: "ADMIN",
        },
    })
    console.log("✅ Created admin user:", adminAddress.username)

    // 2. Units from constants.ts
    const units = [
        { value: "ĐTB", label: "Đội Quản lý điện Thanh Bình" },
        { value: "ĐTN", label: "Đội Quản lý điện Tam Nông" },
        { value: "ĐCL", label: "Đội Quản lý điện Cao Lãnh" },
        { value: "ĐMT", label: "Đội Quản lý điện Mỹ Thọ" },
        { value: "ĐHN", label: "Đội Quản lý điện Hồng Ngự" },
        { value: "ĐTTT", label: "Đội Quản lý điện Thường Thới Tiền" },
        { value: "ĐTM", label: "Đội Quản lý điện Tháp Mười" },
        { value: "ĐTH", label: "Đội Quản lý điện Tân Hồng" },
    ]

    const userPassword = await bcrypt.hash("123456", 10)

    for (const unit of units) {
        // Create Team
        const team = await prisma.team.upsert({
            where: { code: unit.value },
            update: { name: unit.label },
            create: {
                name: unit.label,
                code: unit.value,
            },
        })

        // Create User for Team (lowercase value without accents is username)
        const username = removeAccents(unit.value).toLowerCase()
        const user = await prisma.user.upsert({
            where: { username: username },
            update: { teamId: team.id },
            create: {
                username: username,
                password: userPassword,
                name: unit.label,
                role: "USER",
                teamId: team.id,
            },
        })
        console.log(`✅ Created team: ${team.code} and user: ${user.username}`)
    }

    console.log("🎉 Seeding completed!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
