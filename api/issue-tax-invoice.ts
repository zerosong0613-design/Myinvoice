import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.BOLTA_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'BOLTA_API_KEY가 설정되지 않았습니다. Vercel 환경변수에 추가해주세요.' })
  }

  const customerKey = process.env.BOLTA_CUSTOMER_KEY
  if (!customerKey) {
    return res.status(500).json({ error: 'BOLTA_CUSTOMER_KEY가 설정되지 않았습니다.' })
  }

  const {
    // 공급자 (우리 사업자)
    supplier,
    // 공급받는자
    receiver,
    // 품목
    items,
    // 발행 정보
    purpose, // 'receipt' (영수) | 'claim' (청구)
    description,
    referenceId,
  } = req.body ?? {}

  if (!supplier || !receiver || !items?.length) {
    return res.status(400).json({ error: '공급자, 공급받는자, 품목 정보는 필수입니다.' })
  }

  // Basic Auth 인코딩
  const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`

  try {
    const boltaRes = await fetch('https://xapi.bolta.io/v1/taxInvoices/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Customer-Key': customerKey,
        ...(referenceId ? { 'Bolta-Client-Reference-Id': referenceId } : {}),
      },
      body: JSON.stringify({
        date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        purpose: purpose ?? 'receipt',
        supplier: {
          identificationNumber: supplier.bizNumber?.replace(/-/g, ''),
          organizationName: supplier.name,
          representativeName: supplier.representative,
          address: supplier.address,
          businessItem: supplier.businessItem ?? '',
          businessType: supplier.businessType ?? '',
          manager: supplier.managerEmail ? {
            email: supplier.managerEmail,
          } : undefined,
        },
        receiver: {
          identificationNumber: receiver.bizNumber?.replace(/-/g, ''),
          organizationName: receiver.name,
          representativeName: receiver.representative ?? '',
          address: receiver.address ?? '',
          manager: receiver.email ? {
            email: receiver.email,
          } : undefined,
        },
        items: items.map((item: { date?: string; name: string; unitPrice: number; quantity: number; supplyCost: number; tax: number; description?: string }) => ({
          date: item.date ?? new Date().toISOString().split('T')[0].replace(/-/g, ''),
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          supplyCost: item.supplyCost,
          tax: item.tax,
          description: item.description ?? '',
        })),
        description: description ?? '',
      }),
    })

    const boltaData = await boltaRes.json()

    if (!boltaRes.ok) {
      return res.status(boltaRes.status).json({
        error: boltaData.message ?? '세금계산서 발행에 실패했습니다.',
        details: boltaData,
      })
    }

    return res.status(200).json({
      success: true,
      data: boltaData,
    })
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : '세금계산서 발행 중 오류가 발생했습니다.',
    })
  }
}
