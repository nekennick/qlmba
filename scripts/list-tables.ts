import { PrismaClient } from '@prisma/client'
import * as path from 'path'

async function main() {
    const oldDbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')
    const prismaOld = new PrismaClient({
        datasources: {
            db: {
                url: `file:${oldDbPath}`
            }
        }
    })

    try {
        const tables: any[] = await prismaOld.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`
        console.log('Tables in old DB:', tables.map(t => t.name))

        for (const table of tables) {
            if (table.name === '_prisma_migrations') continue;
            const count: any[] = await prismaOld.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table.name}`)
            console.log(`Table ${table.name}: ${count[0].count} rows`)
        }
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prismaOld.$disconnect()
    }
}

main()
