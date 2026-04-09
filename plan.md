# 마이인보이스 (MyInvoice) — 개발 플랜

> 소규모 사업자를 위한 무료 청구서·견적서 관리 SaaS  
> 스택: Vite + React + TypeScript · shadcn/ui · Supabase · Vercel  
> GitHub: https://github.com/zerosong0613-design/Myinvoice  
> 배포: https://myinvoice-mu.vercel.app  
> 최초 작성: 2026-04-08 · 최종 수정: 2026-04-09

---

## 1. 서비스 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | 마이인보이스 (MyInvoice) |
| 배포 URL | https://myinvoice-mu.vercel.app |
| GitHub | https://github.com/zerosong0613-design/Myinvoice |
| Supabase | https://kpizzslepjubluvetess.supabase.co |
| 타깃 유저 | 프리랜서, 1인 법인, 소규모 사업자 |
| 핵심 가치 | 무료 · 한국 특화 · 팀 워크스페이스 |

---

## 2. 기능 범위 & 진행 상황

### Phase 1 — MVP (청구서 코어) ✅ 완료 (2026-04-08)
- [x] Google OAuth 로그인
- [x] 워크스페이스 생성 / 기본 사업자 정보 입력
- [x] 청구서 CRUD (번호 자동채번 INV-YYYYMM-NNN, 부가세 포함/별도)
- [x] 견적서 CRUD (QT-YYYYMM-NNN)
- [x] 신용전표 CRUD (CN-YYYYMM-NNN, 원본 청구서 연결)
- [x] 거래처(고객) DB 관리
- [x] 품목 DB 관리
- [x] 품목 카테고리 계층 구조 (categories 테이블, 무한 깊이 트리)
- [x] 청구서 상태 관리: draft → sent → paid → overdue → cancelled
- [x] 대시보드 (미수금 / 월 매출 / 청구 건수 / 연체)
- [x] 통계 탭 (월별 매출 바 차트, recharts)
- [x] 설정 페이지 (워크스페이스 정보 수정)
- [x] Supabase RLS 정책 (워크스페이스 멤버 기반 접근 제어)
- [x] Vercel 배포 + 환경변수 설정

### Phase 1.5 — 문서 연동 & 완성도 ✅ 완료 (2026-04-09)
- [x] 워크스페이스 로그인 버그 수정 (기존 워크스페이스 확인 + 재시도 로직)
- [x] 견적서 → 청구서 변환 (품목/거래처 자동 복사, 상태 연동)
- [x] 청구서 → 신용전표 발행 (품목/거래처 자동 복사)
- [x] 청구서 상세에서 관련 문서 표시 (원본 견적서, 연결 신용전표)
- [x] 대시보드 확장 (견적서/신용전표 KPI + 최근 목록)
- [x] PDF 출력 — 한국 세금계산서 스타일 (@react-pdf/renderer, Noto Sans KR)
- [x] 이메일 발송 — Resend API + Vercel Serverless Function + PDF 첨부
- [x] DB 마이그레이션 004: source_quote_id, converted_invoice_id 컬럼

### Phase 2 — 팀 협업 (멀티 사용자) 🔜 다음
- [ ] 멤버 이메일 초대 (초대 링크 생성 → 수락 시 워크스페이스 합류)
- [ ] 역할 권한 분기: owner(전체) / admin(관리) / member(조회·생성)
- [ ] 멤버 관리 페이지 (목록, 역할 변경, 제거)
- [ ] 워크스페이스 전환 드롭다운 (1인이 여러 사업체 관리)
- [ ] 활동 로그 (누가 청구서를 생성/수정했는지)

### Phase 3 — 완성도
- [x] PDF 출력 (세금계산서 스타일, 클라이언트 사이드)
- [x] 이메일 발송 (Resend API, PDF 첨부)
- [ ] 청구서 공유 링크 (토큰 기반 공개 URL, 고객이 브라우저에서 열람)
- [ ] 반복 청구서 (정기 고객용 복사 생성)
- [ ] 설정: 로고 업로드, 기본 납부기한, 메모 템플릿
- [ ] 상태 라벨 정리 ("발송됨" → "발행완료" 등)

### Phase 4 — 한국 특화 (선택)
- [ ] 원천세 3.3% 계산 옵션
- [ ] 사업자번호 유효성 검증 (공공데이터 API)
- [ ] 세금계산서 홈택스 연동 (e세로 API)

---

## 3. 기술 스택

| 레이어 | 선택 | 비고 |
|--------|------|------|
| 프레임워크 | Vite + React 19 + TypeScript | |
| UI | shadcn/ui + Tailwind CSS v4 | Button, Card, Dialog, Table, Select 등 |
| 상태관리 | Zustand | useAuthStore, useWorkspaceStore |
| 백엔드/DB | Supabase (PostgreSQL + RLS) | 무료 티어 |
| 인증 | Supabase Auth + Google OAuth | |
| PDF | @react-pdf/renderer | 한국 세금계산서 스타일, Noto Sans KR |
| 아이콘 | Lucide React | |
| 차트 | Recharts | 월별 매출 |
| 배포 | Vercel | Git 연동 자동 배포 + Serverless Functions |
| 이메일 | Resend | 무료 3,000통/월, Vercel API Route |

---

## 4. DB 스키마 (현재)

### 테이블 목록
```
workspaces              — 워크스페이스 (사업체)
workspace_members       — 멤버 & 역할
categories              — 품목 카테고리 (자기참조 트리)
customers               — 거래처
products                — 품목 (category_id 연결)
invoices                — 청구서 (source_quote_id 추가)
invoice_items           — 청구서 품목
quotes                  — 견적서 (converted_invoice_id 추가)
quote_items             — 견적서 품목
credit_notes            — 신용전표 (original_invoice_id)
credit_note_items       — 신용전표 품목
```

### 뷰
```
workspace_invoice_stats — 워크스페이스별 청구서 통계
monthly_revenue         — 월별 매출
```

### 함수 & 트리거
```
get_my_workspace_ids()  — 현재 사용자의 활성 워크스페이스 목록 (RLS 헬퍼)
update_updated_at()     — updated_at 자동 갱신 트리거
```

---

## 5. 폴더 구조 (현재)

```
MyInvoice/
├── api/
│   └── send-email.ts          # Vercel Serverless Function (Resend)
├── src/
│   ├── components/
│   │   ├── ui/                # shadcn/ui (15개 컴포넌트)
│   │   ├── layout/            # AuthGuard, Layout, Sidebar
│   │   ├── invoice/           # InvoiceStatusBadge, QuoteStatusBadge, CreditNoteStatusBadge
│   │   ├── pdf/               # DocumentPDF, PDFDownloadBtn
│   │   ├── email/             # SendEmailDialog
│   │   ├── customer/          # CustomerDialog
│   │   ├── product/           # ProductDialog
│   │   └── category/          # CategoryDialog
│   ├── hooks/
│   │   ├── useInvoices.ts
│   │   ├── useQuotes.ts
│   │   ├── useCreditNotes.ts
│   │   ├── useCustomers.ts
│   │   ├── useProducts.ts
│   │   └── useCategories.ts
│   ├── pages/
│   │   ├── auth/Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Invoices.tsx / InvoiceForm.tsx / InvoiceDetail.tsx
│   │   ├── Quotes.tsx / QuoteForm.tsx / QuoteDetail.tsx
│   │   ├── CreditNotes.tsx / CreditNoteForm.tsx / CreditNoteDetail.tsx
│   │   ├── Customers.tsx
│   │   ├── Products.tsx
│   │   ├── Categories.tsx
│   │   ├── Statistics.tsx
│   │   ├── Settings.tsx
│   │   └── WorkspaceSetup.tsx
│   ├── store/
│   │   ├── useAuthStore.ts
│   │   └── useWorkspaceStore.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── types/index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/migrations/
│   ├── 001_initial.sql
│   ├── 001_clean.sql
│   ├── 002_fix_rls_insert.sql
│   ├── 003_categories.sql
│   └── 004_document_linking.sql
├── .env.local
├── package.json
├── vite.config.ts
└── plan.md
```

---

## 6. 환경변수

```
# .env.local (프론트엔드)
VITE_SUPABASE_URL=https://kpizzslepjubluvetess.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_NJ_BbGFpI8zHeQ2rTgxreQ_jYHlxGSt

# Vercel 환경변수 (서버 사이드)
RESEND_API_KEY=           # ⚠️ 설정 필요 — Resend에서 발급
RESEND_FROM_EMAIL=        # 선택, 기본값: noreply@resend.dev
```
Vercel에도 동일하게 등록 완료 (Resend 키 제외).

---

## 7. 알려진 이슈 / 설정 필요 항목

| 이슈 | 상태 | 해결 방법 |
|------|------|-----------|
| Supabase Auth Redirect URL | ⚠️ 미완료 | Supabase Auth → URL Configuration → Site URL을 `https://myinvoice-mu.vercel.app`로 변경, Redirect URLs에 Vercel URL 추가 |
| Google OAuth Redirect URI | ⚠️ 확인 필요 | Google Cloud Console에서 `https://kpizzslepjubluvetess.supabase.co/auth/v1/callback` 등록 확인 |
| DB 마이그레이션 004 | ⚠️ 실행 필요 | Supabase SQL Editor에서 `004_document_linking.sql` 실행 (source_quote_id, converted_invoice_id) |
| Resend API Key | ⚠️ 설정 필요 | Vercel 환경변수에 `RESEND_API_KEY` 추가 |

---

## 8. 오픈 이슈 / 결정 보류

| 이슈 | 옵션 A | 옵션 B | 결정 시점 |
|------|--------|--------|-----------|
| 초대 방식 | 이메일 초대 링크 | 초대 코드 입력 | Phase 2 시작 시 |
| 모바일 지원 | 반응형 웹 | 별도 앱 | 오픈 후 피드백 |
| 세금계산서 연동 | 직접 개발 | 단순 링크 안내 | Phase 4 |
| 공유 링크 인증 | 토큰 기반 | 비밀번호 | Phase 3 |

---

_last updated: 2026-04-09_
