import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("🧹 Cleaning up old DOI users...")

    const deletedUsers = await prisma.user.deleteMany({
        where: {
            username: {
                in: ['doi1', 'doi2', 'doi3']
            }
        }
    })
    console.log(`✅ Deleted ${deletedUsers.count} old DOI users.`)

    const deletedTeams = await prisma.team.deleteMany({
        where: {
            code: {
                in: ['DOI1', 'DOI2', 'DOI3']
            }
        }
    })
    console.log(`✅ Deleted ${deletedTeams.count} old DOI teams.`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
