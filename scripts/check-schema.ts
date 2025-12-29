import { PrismaClient } from '@prisma/client'
import * as path from 'path'

async function main() {
    const backupDbPath = path.resolve(process.cwd(), 'prisma', 'dev-29-12.db')

    const prismaBackup = new PrismaClient({
        datasources: {
            db: {
                url: `file:${backupDbPath}`
            }
        }
    })

    try {
        const transformerColumns: any[] = await prismaBackup.$queryRawUnsafe(`PRAGMA table_info(Transformer)`)
        console.log('Transformer columns in backup:', transformerColumns.map((c: any) => c.name))

        const dispatchColumns: any[] = await prismaBackup.$queryRawUnsafe(`PRAGMA table_info(Dispatch)`)
        console.log('Dispatch columns in backup:', dispatchColumns.map((c: any) => c.name))

    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prismaBackup.$disconnect()
    }
}

main()
