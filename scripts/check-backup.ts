import { PrismaClient } from '@prisma/client'
import * as path from 'path'

async function main() {
    const backupDbPath = path.resolve(process.cwd(), 'prisma', 'dev-29-12.db')
    console.log('Backup DB Path:', backupDbPath)

    const prismaBackup = new PrismaClient({
        datasources: {
            db: {
                url: `file:${backupDbPath}`
            }
        }
    })

    try {
        const tables: any[] = await prismaBackup.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`
        console.log('Tables in backup DB:', tables.map(t => t.name))

        for (const table of tables) {
            if (table.name === '_prisma_migrations') continue;
            const count: any[] = await prismaBackup.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table.name}`)
            console.log(`Table ${table.name}: ${count[0].count} rows`)
        }

        // Sample data from Dispatch table
        const dispatches: any[] = await prismaBackup.$queryRaw`SELECT * FROM Dispatch LIMIT 3`
        console.log('\nSample Dispatches:', dispatches)

    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prismaBackup.$disconnect()
    }
}

main()
