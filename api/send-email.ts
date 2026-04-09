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

  const { to, subject, body, pdfBase64, filename } = req.body ?? {}

  if (!to || !subject || !body) {
    return res.status(400).json({ error: '수신자, 제목, 본문은 필수입니다.' })
  }

  const resend = new Resend(apiKey)

  try {
    const emailPayload: {
      from: string
      to: string
      subject: string
      text: string
      attachments?: { filename: string; content: Buffer }[]
    } = {
      from: process.env.RESEND_FROM_EMAIL ?? 'MyInvoice <noreply@resend.dev>',
      to,
      subject,
      text: body,
    }

    if (pdfBase64 && filename) {
      emailPayload.attachments = [
        {
          filename,
          content: Buffer.from(pdfBase64, 'base64'),
        },
      ]
    }

    const { error } = await resend.emails.send(emailPayload)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : '이메일 발송에 실패했습니다.',
    })
  }
}
