import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Map hậu tố -> mã đội
const suffixToTeamCode: Record<string, string> = {
    '/TTr-ĐTB': 'ĐTB',
    '/ĐTB-KT': 'ĐTB',
    '/TTr-ĐTN': 'ĐTN',
    '/ĐTN-KT': 'ĐTN',
    '/TTr-ĐCL': 'ĐCL',
    '/ĐCL-KT': 'ĐCL',
    '/TTr-ĐMT': 'ĐMT',
    '/ĐMT-KT': 'ĐMT',
    '/TTr-ĐHN': 'ĐHN',
    '/ĐHN-KT': 'ĐHN',
    '/TTr-ĐTTT': 'ĐTTT',
    '/ĐTTT-KT': 'ĐTTT',
    '/TTr-ĐTM': 'ĐTM',
    '/ĐTM-KT': 'ĐTM',
    '/TTr-ĐTH': 'ĐTH',
    '/ĐTH-KT': 'ĐTH',
}

// CV chính thức (không có hậu tố đội) -> để null hoặc gán admin
const cvSuffix = '/PCĐT-KT+KHVT'

async function main() {
    console.log('🔍 Phân tích và tách dữ liệu theo đội...')

    // Lấy tất cả teams
    const teams = await prisma.team.findMany()
    const teamCodeToId: Record<string, string> = {}
    for (const team of teams) {
        teamCodeToId[team.code] = team.id
    }
    console.log('Teams:', Object.keys(teamCodeToId))

    // Lấy tất cả dispatches
    const dispatches = await prisma.dispatch.findMany()
    console.log(`Tổng số công văn: ${dispatches.length}`)

    let updated = 0
    let skipped = 0

    for (const dispatch of dispatches) {
        const dispatchNumber = dispatch.dispatchNumber || ''
        let foundTeamCode: string | null = null

        // Tìm hậu tố phù hợp
        for (const [suffix, teamCode] of Object.entries(suffixToTeamCode)) {
            if (dispatchNumber.includes(suffix)) {
                foundTeamCode = teamCode
                break
            }
        }

        if (foundTeamCode && teamCodeToId[foundTeamCode]) {
            const newTeamId = teamCodeToId[foundTeamCode]
            if (dispatch.teamId !== newTeamId) {
                await prisma.dispatch.update({
                    where: { id: dispatch.id },
                    data: { teamId: newTeamId }
                })
                console.log(`✅ ${dispatchNumber} -> ${foundTeamCode}`)
                updated++
            } else {
                skipped++
            }
        } else if (dispatchNumber.includes(cvSuffix)) {
            // CV chính thức - giữ nguyên teamId hiện tại (hoặc để null nếu muốn admin xem tất cả)
            console.log(`📄 CV chính thức: ${dispatchNumber} (giữ nguyên)`)
            skipped++
        } else {
            console.log(`⚠️ Không xác định được đội: ${dispatchNumber}`)
            skipped++
        }
    }

    console.log(`\n🎉 Hoàn thành!`)
    console.log(`   - Đã cập nhật: ${updated} công văn`)
    console.log(`   - Bỏ qua: ${skipped} công văn`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
