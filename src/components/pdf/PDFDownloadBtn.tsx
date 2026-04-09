import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DocumentPDF from './DocumentPDF'
import type { Workspace, Invoice, Quote, CreditNote, InvoiceItem, QuoteItem, CreditNoteItem } from '@/types'

type DocumentType = 'invoice' | 'quote' | 'credit_note'

interface PDFDownloadBtnProps {
  type: DocumentType
  document: Invoice | Quote | CreditNote
  items: InvoiceItem[] | QuoteItem[] | CreditNoteItem[]
  workspace: Workspace
  filename: string
}

export default function PDFDownloadBtn({ type, document, items, workspace, filename }: PDFDownloadBtnProps) {
  const [generating, setGenerating] = useState(false)

  const handleDownload = async () => {
    setGenerating(true)
    try {
      const blob = await pdf(
        <DocumentPDF type={type} document={document} items={items} workspace={workspace} />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = `${filename}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF 생성 실패:', err)
      alert('PDF 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={generating}>
      {generating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      PDF
    </Button>
  )
}

// PDF를 base64로 변환 (이메일 발송용)
export async function generatePDFBase64(
  type: DocumentType,
  document: Invoice | Quote | CreditNote,
  items: InvoiceItem[] | QuoteItem[] | CreditNoteItem[],
  workspace: Workspace
): Promise<string> {
  const blob = await pdf(
    <DocumentPDF type={type} document={document} items={items} workspace={workspace} />
  ).toBlob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
