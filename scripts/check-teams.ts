import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        include: { team: true }
    })

    console.log('Users and their teams:')
    for (const user of users) {
        console.log(`  ${user.username} | teamId: ${user.teamId} | teamCode: ${user.team?.code || 'N/A'}`)
    }

    console.log('\nDispatches and their teams:')
    const dispatches = await prisma.dispatch.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    })
    for (const d of dispatches) {
        console.log(`  ${d.dispatchNumber} | teamId: ${d.teamId || 'NULL'}`)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
