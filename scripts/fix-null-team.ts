import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Get ĐCL team
    const dclTeam = await prisma.team.findFirst({
        where: { code: 'ĐCL' }
    })

    if (!dclTeam) {
        console.log('Team ĐCL not found!')
        return
    }

    console.log('ĐCL Team ID:', dclTeam.id)

    // Find dispatches with NULL teamId that have ĐCL suffix
    const nullDispatches = await prisma.dispatch.findMany({
        where: { teamId: null }
    })

    console.log(`Found ${nullDispatches.length} dispatches with NULL teamId:`)

    for (const d of nullDispatches) {
        console.log(`  ${d.dispatchNumber} - updating to ĐCL...`)
        await prisma.dispatch.update({
            where: { id: d.id },
            data: { teamId: dclTeam.id }
        })
    }

    console.log('Done!')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
