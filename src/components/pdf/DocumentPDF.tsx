import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { Workspace, Invoice, Quote, CreditNote, InvoiceItem, QuoteItem, CreditNoteItem } from '@/types'

// 한글 폰트 등록 (Noto Sans KR)
Font.register({
  family: 'NotoSansKR',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetOTF/KR/NotoSansKR-Regular.otf',
      fontWeight: 400,
    },
    {
      src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetOTF/KR/NotoSansKR-Bold.otf',
      fontWeight: 700,
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansKR',
    fontSize: 9,
    padding: 30,
    color: '#1a1a1a',
  },
  // 제목
  titleBar: {
    backgroundColor: '#1e40af',
    padding: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
  },
  docNumber: {
    color: '#dbeafe',
    fontSize: 10,
  },
  // 공급자 / 공급받는자 정보
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  infoBox: {
    flex: 1,
    border: '1px solid #d1d5db',
    borderRadius: 4,
    padding: 10,
  },
  infoBoxTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  infoName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  infoLine: {
    fontSize: 8,
    color: '#4b5563',
    marginBottom: 2,
  },
  // 문서 정보
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottom: '1px solid #e5e7eb',
  },
  metaItem: {
    flexDirection: 'row',
    gap: 4,
  },
  metaLabel: {
    fontSize: 8,
    color: '#6b7280',
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 700,
  },
  // 품목 테이블
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: '2px solid #1e40af',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  colNo: { width: '6%', textAlign: 'center' },
  colName: { width: '30%' },
  colDesc: { width: '24%' },
  colQty: { width: '10%', textAlign: 'right' },
  colPrice: { width: '15%', textAlign: 'right' },
  colAmount: { width: '15%', textAlign: 'right' },
  headerText: {
    fontSize: 8,
    fontWeight: 700,
    color: '#374151',
  },
  cellText: {
    fontSize: 8,
  },
  // 합계
  summaryBox: {
    alignSelf: 'flex-end',
    width: 200,
    border: '1px solid #d1d5db',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 9,
  },
  summaryDivider: {
    borderBottom: '1px solid #d1d5db',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 700,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1e40af',
  },
  // 메모
  memoBox: {
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
  },
  memoTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: '#6b7280',
    marginBottom: 4,
  },
  memoText: {
    fontSize: 8,
    color: '#4b5563',
  },
  // 푸터
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 8,
  },
})

type DocumentType = 'invoice' | 'quote' | 'credit_note'
type DocumentData = Invoice | Quote | CreditNote
type ItemData = InvoiceItem | QuoteItem | CreditNoteItem

const TYPE_CONFIG: Record<DocumentType, { title: string; dateLabel: string; numberField: string }> = {
  invoice: { title: '청 구 서', dateLabel: '납기일', numberField: 'invoice_number' },
  quote: { title: '견 적 서', dateLabel: '유효기한', numberField: 'quote_number' },
  credit_note: { title: '신 용 전 표', dateLabel: '발행일', numberField: 'credit_note_number' },
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n)
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

interface DocumentPDFProps {
  type: DocumentType
  document: DocumentData
  items: ItemData[]
  workspace: Workspace
}

export default function DocumentPDF({ type, document, items, workspace }: DocumentPDFProps) {
  const config = TYPE_CONFIG[type]
  const docNumber = (document as unknown as Record<string, unknown>)[config.numberField] as string
  const issuedAt = document.issued_at
  const secondDate =
    type === 'invoice'
      ? (document as Invoice).due_at
      : type === 'quote'
        ? (document as Quote).valid_until
        : null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 제목 */}
        <View style={styles.titleBar}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.docNumber}>{docNumber}</Text>
        </View>

        {/* 공급자 / 공급받는자 */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>공급자</Text>
            <Text style={styles.infoName}>{workspace.name}</Text>
            {workspace.biz_number && (
              <Text style={styles.infoLine}>사업자번호: {workspace.biz_number}</Text>
            )}
            {workspace.address && (
              <Text style={styles.infoLine}>{workspace.address}</Text>
            )}
            {workspace.phone && (
              <Text style={styles.infoLine}>TEL: {workspace.phone}</Text>
            )}
            {workspace.email && (
              <Text style={styles.infoLine}>{workspace.email}</Text>
            )}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>공급받는자</Text>
            <Text style={styles.infoName}>{document.customer_name}</Text>
            {document.customer_email && (
              <Text style={styles.infoLine}>{document.customer_email}</Text>
            )}
          </View>
        </View>

        {/* 문서 정보 */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>발행일: </Text>
            <Text style={styles.metaValue}>{fmtDate(issuedAt)}</Text>
          </View>
          {secondDate && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{config.dateLabel}: </Text>
              <Text style={styles.metaValue}>{fmtDate(secondDate)}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>부가세: </Text>
            <Text style={styles.metaValue}>
              {document.tax_type === 'inclusive' ? '포함' : '별도'}
            </Text>
          </View>
        </View>

        {/* 품목 테이블 */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colNo]}>No</Text>
            <Text style={[styles.headerText, styles.colName]}>품목명</Text>
            <Text style={[styles.headerText, styles.colDesc]}>설명</Text>
            <Text style={[styles.headerText, styles.colQty]}>수량</Text>
            <Text style={[styles.headerText, styles.colPrice]}>단가</Text>
            <Text style={[styles.headerText, styles.colAmount]}>금액</Text>
          </View>
          {items.map((item, idx) => (
            <View style={styles.tableRow} key={idx}>
              <Text style={[styles.cellText, styles.colNo]}>{idx + 1}</Text>
              <Text style={[styles.cellText, styles.colName]}>{item.name}</Text>
              <Text style={[styles.cellText, styles.colDesc]}>{item.description ?? ''}</Text>
              <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cellText, styles.colPrice]}>{fmtCurrency(item.unit_price)}</Text>
              <Text style={[styles.cellText, styles.colAmount]}>{fmtCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* 합계 */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>공급가액</Text>
            <Text style={styles.summaryValue}>{fmtCurrency(document.subtotal)}원</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>부가세</Text>
            <Text style={styles.summaryValue}>{fmtCurrency(document.tax_amount)}원</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>합계</Text>
            <Text style={styles.totalValue}>{fmtCurrency(document.total)}원</Text>
          </View>
        </View>

        {/* 메모 */}
        {document.memo && (
          <View style={styles.memoBox}>
            <Text style={styles.memoTitle}>비고</Text>
            <Text style={styles.memoText}>{document.memo}</Text>
          </View>
        )}

        {/* 푸터 */}
        <Text style={styles.footer}>
          {workspace.name} | {docNumber} | 마이인보이스로 생성됨
        </Text>
      </Page>
    </Document>
  )
}
