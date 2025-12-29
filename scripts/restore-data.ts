import { PrismaClient } from '@prisma/client'
import * as path from 'path'

async function main() {
    const backupDbPath = path.resolve(process.cwd(), 'prisma', 'dev-29-12.db')
    const currentDbPath = path.resolve(process.cwd(), 'prisma', 'dev.db')

    console.log('Backup DB Path:', backupDbPath)
    console.log('Current DB Path:', currentDbPath)

    const prismaBackup = new PrismaClient({
        datasources: {
            db: {
                url: `file:${backupDbPath}`
            }
        }
    })

    const prismaCurrent = new PrismaClient({
        datasources: {
            db: {
                url: `file:${currentDbPath}`
            }
        }
    })

    try {
        // 1. Get default team (ĐTB - Thanh Bình) for assigning old data
        const defaultTeam = await prismaCurrent.team.findFirst({
            where: { code: 'ĐTB' }
        })

        if (!defaultTeam) {
            console.error('Default team ĐTB not found! Run seed first.')
            return
        }
        console.log('Default team for old data:', defaultTeam.name, defaultTeam.id)

        // 2. Read all dispatches from backup (no teamId column in backup)
        const oldDispatches: any[] = await prismaBackup.$queryRaw`
            SELECT id, dispatchNumber, fileUrl, type, documentType, isCBM, 
                   date, transactionDate, linkedCvId, sourceDispatchId, 
                   createdAt, updatedAt 
            FROM Dispatch
        `
        console.log(`Found ${oldDispatches.length} dispatches in backup`)

        // 3. Read all transformers from backup (no imageUrl column in backup)
        const oldTransformers: any[] = await prismaBackup.$queryRaw`
            SELECT id, serialNumber, capacity, model, note, testResult, 
                   isProcessed, dispatchId, createdAt, updatedAt 
            FROM Transformer
        `
        console.log(`Found ${oldTransformers.length} transformers in backup`)

        // 4. Insert dispatches into current DB (with teamId)
        let dispatchCount = 0
        for (const d of oldDispatches) {
            try {
                await prismaCurrent.$executeRawUnsafe(`
                    INSERT OR IGNORE INTO Dispatch 
                    (id, dispatchNumber, fileUrl, type, documentType, isCBM, 
                     date, transactionDate, linkedCvId, sourceDispatchId, 
                     teamId, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                    d.id,
                    d.dispatchNumber,
                    d.fileUrl,
                    d.type,
                    d.documentType,
                    d.isCBM ? 1 : 0,
                    d.date,
                    d.transactionDate,
                    d.linkedCvId,
                    d.sourceDispatchId,
                    defaultTeam.id,
                    d.createdAt,
                    d.updatedAt
                )
                dispatchCount++
            } catch (err) {
                console.error(`Error inserting dispatch ${d.id}:`, err)
            }
        }
        console.log(`✅ Inserted ${dispatchCount} dispatches`)

        // 5. Insert transformers into current DB (without imageUrl - backup doesn't have it)
        let transformerCount = 0
        for (const t of oldTransformers) {
            try {
                await prismaCurrent.$executeRawUnsafe(`
                    INSERT OR IGNORE INTO Transformer 
                    (id, serialNumber, capacity, model, note, testResult, 
                     isProcessed, dispatchId, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                    t.id,
                    t.serialNumber,
                    t.capacity,
                    t.model,
                    t.note,
                    t.testResult,
                    t.isProcessed ? 1 : 0,
                    t.dispatchId,
                    t.createdAt,
                    t.updatedAt
                )
                transformerCount++
            } catch (err) {
                console.error(`Error inserting transformer ${t.id}:`, err)
            }
        }
        console.log(`✅ Inserted ${transformerCount} transformers`)

        console.log('\n🎉 Data restoration completed!')

    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prismaBackup.$disconnect()
        await prismaCurrent.$disconnect()
    }
}

main()
