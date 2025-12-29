import { PrismaClient } from '@prisma/client'
import * as path from 'path'

async function main() {
    const oldDbPath = path.resolve(process.cwd(), 'dev.db')
    console.log('Old DB Path:', oldDbPath)

    const prismaOld = new PrismaClient({
        datasources: {
            db: {
                url: `file:${oldDbPath}`
            }
        }
    })

    try {
        // We use queryRaw because the model in the current client expects teamId which isn't in the old DB
        const dispatches: any[] = await prismaOld.$queryRaw`SELECT * FROM Dispatch`
        console.log(`Found ${dispatches.length} dispatches in old DB.`)

        const transformers: any[] = await prismaOld.$queryRaw`SELECT * FROM Transformer`
        console.log(`Found ${transformers.length} transformers in old DB.`)

        if (dispatches.length > 0) {
            console.log('Sample dispatch:', dispatches[0])
        }
    } catch (error) {
        console.error('Error reading old DB:', error)
    } finally {
        await prismaOld.$disconnect()
    }
}

main()
