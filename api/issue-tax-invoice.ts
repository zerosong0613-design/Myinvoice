import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 워크스페이스별 키 우선, 없으면 환경변수 폴백
  const apiKey = req.body?.boltaApiKey || process.env.BOLTA_API_KEY
  const customerKey = req.body?.boltaCustomerKey || process.env.BOLTA_CUSTOMER_KEY

  if (!apiKey) {
    return res.status(500).json({ error: '볼타 API Key가 설정되지 않았습니다. 설정 → 연동 설정에서 입력해주세요.' })
  }
  if (!customerKey) {
    return res.status(500).json({ error: '볼타 Customer Key가 설정되지 않았습니다.' })
  }

  const { supplier, receiver, items, purpose, description, referenceId } = req.body ?? {}

  if (!supplier || !receiver || !items?.length) {
    return res.status(400).json({ error: '공급자, 공급받는자, 품목 정보는 필수입니다.' })
  }

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
          manager: supplier.managerEmail ? { email: supplier.managerEmail } : undefined,
        },
        receiver: {
          identificationNumber: receiver.bizNumber?.replace(/-/g, ''),
          organizationName: receiver.name,
          representativeName: receiver.representative ?? '',
          address: receiver.address ?? '',
          manager: receiver.email ? { email: receiver.email } : undefined,
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

    return res.status(200).json({ success: true, data: boltaData })
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : '세금계산서 발행 중 오류가 발생했습니다.',
    })
  }
}
