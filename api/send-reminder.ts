import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Resend } from 'resend'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY가 설정되지 않았습니다.' })
  }

  const { to, customerName, invoiceNumber, amount, dueDate, overdueDays, senderName } = req.body ?? {}

  if (!to || !invoiceNumber) {
    return res.status(400).json({ error: '수신자와 청구서 정보는 필수입니다.' })
  }

  const resend = new Resend(apiKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'MyInvoice <noreply@resend.dev>'

  // 연체 단계별 톤 조절
  let subject: string
  let body: string

  if (overdueDays <= 7) {
    subject = `[${senderName}] ${invoiceNumber} 결제 안내`
    body = `${customerName} 담당자님께,\n\n안녕하세요, ${senderName}입니다.\n\n아래 청구서의 납기일(${dueDate})이 지났음을 안내드립니다.\n\n- 청구서: ${invoiceNumber}\n- 금액: ${amount}\n- 납기일: ${dueDate}\n\n혹시 이미 처리하셨다면 양해 부탁드립니다.\n확인 부탁드리겠습니다.\n\n감사합니다.\n${senderName}`
  } else if (overdueDays <= 30) {
    subject = `[${senderName}] ${invoiceNumber} 미결제 건 확인 요청`
    body = `${customerName} 담당자님께,\n\n안녕하세요, ${senderName}입니다.\n\n아래 청구서가 ${overdueDays}일 경과되었습니다. 결제 일정 확인을 부탁드립니다.\n\n- 청구서: ${invoiceNumber}\n- 금액: ${amount}\n- 납기일: ${dueDate} (${overdueDays}일 경과)\n\n빠른 확인 부탁드리겠습니다.\n\n감사합니다.\n${senderName}`
  } else {
    subject = `[${senderName}] ${invoiceNumber} 장기 미결제 건 (${overdueDays}일 경과)`
    body = `${customerName} 담당자님께,\n\n안녕하세요, ${senderName}입니다.\n\n아래 청구서가 ${overdueDays}일째 미결제 상태입니다.\n빠른 시일 내 결제 처리를 부탁드립니다.\n\n- 청구서: ${invoiceNumber}\n- 금액: ${amount}\n- 납기일: ${dueDate} (${overdueDays}일 경과)\n\n사정이 있으시다면 연락 부탁드립니다.\n\n감사합니다.\n${senderName}`
  }

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text: body,
    })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : '이메일 발송 실패',
    })
  }
}
