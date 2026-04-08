# 핸디인보이스 (HandyInvoice) — 개발 플랜

> 소규모 사업자를 위한 무료 청구서·견적서 관리 SaaS  
> 스택: Vite + React · Supabase (Auth / PostgreSQL / Storage) · Vercel  
> 수익 모델: 없음 (사이드 프로젝트)  
> 최초 작성: 2026-04-08

---

## 1. 서비스 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | 핸디인보이스 (HandyInvoice) |
| 도메인 후보 | handyinvoice.kr |
| 벤치마크 | InvoiceBee (유료, $80/yr) → 무료로 대체 |
| 경쟁 포지션 | 청구스(유료·자동화 B2B)와 달리 심플·무료·팀 협업 중심 |
| 타깃 유저 | 프리랜서, 1인 법인, 소규모 사업자 |
| 핵심 가치 | 무료 · 한국 특화 · 팀 워크스페이스 |

---

## 2. 기능 범위

### Phase 1 — MVP (청구서 코어)
- [ ] Google OAuth 로그인
- [ ] 워크스페이스 생성 / 기본 사업자 정보 입력
- [ ] 청구서 CRUD (번호 자동채번, 부가세 포함/별도)
- [ ] 견적서 CRUD
- [ ] 신용전표 CRUD
- [ ] 거래처(고객) DB 관리
- [ ] 품목 DB 관리
- [ ] 청구서 상태 관리: draft → sent → paid → overdue
- [ ] 대시보드 (미수금 / 월 매출 / 청구 건수)
- [ ] 통계 탭 (월별 매출 차트)

### Phase 2 — 멀티 사용자 (워크스페이스 A 모델)
- [ ] 멤버 이메일 초대 (링크 클릭 → 합류)
- [ ] 역할 권한 분기: owner / admin / member
- [ ] 워크스페이스 전환 드롭다운 (1인이 여러 사업체 관리 가능)
- [ ] 활동 로그 (누가 청구서를 생성/수정했는지)

### Phase 3 — 완성도
- [ ] PDF 출력 (react-pdf 또는 html2canvas → Supabase Storage)
- [ ] 청구서 공유 링크 (토큰 기반 공개 URL, 고객이 브라우저에서 열람)
- [ ] 이메일 발송 (Resend API)
- [ ] 반복 청구서 (정기 고객용 복사 생성)
- [ ] 설정: 로고 업로드, 기본 납부기한, 메모 템플릿

### Phase 4 — 한국 특화 (선택, 여유 시)
- [ ] 원천세 3.3% 계산 옵션
- [ ] 사업자번호 유효성 검증 (공공데이터 API)
- [ ] 세금계산서 홈택스 연동 (e세로 API)

---

## 3. 기술 스택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| 프레임워크 | Vite + React | 익숙한 스택, 빠른 개발 |
| 스타일 | Tailwind CSS | 유틸리티 클래스로 빠른 UI |
| 상태관리 | Zustand | 가볍고 심플 |
| 백엔드/DB | Supabase (PostgreSQL) | Auth·RLS·Storage 통합, 무료 티어 충분 |
| 인증 | Supabase Auth + Google OAuth | 소셜 로그인 간편화 |
| 파일 저장 | Supabase Storage | 로고, PDF 저장 |
| 배포 | Vercel | 기존 패턴 유지 |
| 이메일 | Resend | 무료 3,000통/월 |
| PDF | react-pdf 또는 puppeteer | Phase 3에서 결정 |

---

## 4. DB 스키마

### 테이블 목록
```
workspaces
workspace_members
customers
products
invoices
invoice_items
quotes
quote_items
credit_notes
credit_note_items
```

### 핵심 DDL

```sql
-- 워크스페이스
CREATE TABLE workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  biz_number  text,
  owner_id    uuid REFERENCES auth.users NOT NULL,
  logo_url    text,
  address     text,
  phone       text,
  email       text,
  created_at  timestamptz DEFAULT now()
);

-- 멤버 & 역할
CREATE TABLE workspace_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid REFERENCES workspaces ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users ON DELETE CASCADE,
  role           text CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  invited_email  text,
  status         text CHECK (status IN ('active','invited')) DEFAULT 'invited',
  joined_at      timestamptz,
  UNIQUE (workspace_id, user_id)
);

-- 거래처
CREATE TABLE customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid REFERENCES workspaces ON DELETE CASCADE,
  name          text NOT NULL,
  email         text,
  phone         text,
  biz_number    text,
  address       text,
  memo          text,
  created_at    timestamptz DEFAULT now()
);

-- 품목 DB
CREATE TABLE products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid REFERENCES workspaces ON DELETE CASCADE,
  name          text NOT NULL,
  unit_price    numeric(15,2) DEFAULT 0,
  unit          text,
  description   text,
  created_at    timestamptz DEFAULT now()
);

-- 청구서
CREATE TABLE invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES workspaces ON DELETE CASCADE,
  invoice_number  text NOT NULL,
  customer_id     uuid REFERENCES customers,
  customer_name   text NOT NULL,
  customer_email  text,
  issued_at       date NOT NULL DEFAULT CURRENT_DATE,
  due_at          date,
  status          text CHECK (status IN (
                    'draft','sent','paid','overdue','cancelled'
                  )) DEFAULT 'draft',
  tax_type        text CHECK (tax_type IN ('inclusive','exclusive')) DEFAULT 'inclusive',
  subtotal        numeric(15,2) DEFAULT 0,
  tax_amount      numeric(15,2) DEFAULT 0,
  total           numeric(15,2) DEFAULT 0,
  memo            text,
  created_by      uuid REFERENCES auth.users,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 청구서 품목
CREATE TABLE invoice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid REFERENCES invoices ON DELETE CASCADE,
  product_id  uuid REFERENCES products,
  name        text NOT NULL,
  description text,
  quantity    numeric(10,2) DEFAULT 1,
  unit_price  numeric(15,2) DEFAULT 0,
  amount      numeric(15,2) DEFAULT 0,
  sort_order  int DEFAULT 0
);

-- 견적서 / 신용전표: invoices와 동일 구조
-- credit_notes에는 original_invoice_id uuid REFERENCES invoices 추가
```

### RLS 핵심 정책

```sql
-- 모든 테이블에 동일 패턴 적용
CREATE POLICY "workspace_member_only" ON invoices
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```

### 통계 View

```sql
CREATE VIEW workspace_stats AS
SELECT
  workspace_id,
  COUNT(*) FILTER (WHERE status = 'paid')    AS paid_count,
  COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
  SUM(total) FILTER (WHERE status = 'paid')  AS total_revenue,
  SUM(total) FILTER (WHERE status = 'overdue') AS total_overdue
FROM invoices
GROUP BY workspace_id;
```

---

## 5. 폴더 구조

```
handyinvoice/
├── public/
├── src/
│   ├── app/                  # 라우팅 (React Router)
│   │   └── routes.tsx
│   ├── components/
│   │   ├── ui/               # 공통 컴포넌트 (Button, Input, Modal 등)
│   │   ├── invoice/          # 청구서 관련 컴포넌트
│   │   ├── customer/         # 거래처 관련
│   │   └── workspace/        # 워크스페이스·멤버 관련
│   ├── hooks/                # useInvoices, useCustomers 등
│   ├── lib/
│   │   ├── supabase.ts       # supabase client 초기화
│   │   └── utils.ts          # 금액 포맷, 날짜 등
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Invoices.tsx
│   │   ├── InvoiceNew.tsx
│   │   ├── InvoiceDetail.tsx
│   │   ├── Quotes.tsx
│   │   ├── Customers.tsx
│   │   ├── Products.tsx
│   │   ├── Statistics.tsx
│   │   ├── Settings.tsx
│   │   └── auth/
│   │       └── Login.tsx
│   ├── store/                # Zustand 스토어
│   │   ├── useWorkspaceStore.ts
│   │   └── useAuthStore.ts
│   └── types/                # TypeScript 타입 정의
│       └── index.ts
├── supabase/
│   └── migrations/           # SQL 마이그레이션 파일
│       └── 001_initial.sql
├── .env.local
├── index.html
├── vite.config.ts
└── package.json
```

---

## 6. 환경변수

```
# .env.local
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_RESEND_API_KEY=re_...       # Phase 3
```

---

## 7. 개발 로드맵 (주차별)

| 주차 | 목표 | 산출물 |
|------|------|--------|
| 1주 | 프로젝트 세팅 + DB + 인증 | Supabase 스키마 완성, Google 로그인 동작 |
| 2주 | 워크스페이스 + 거래처·품목 CRUD | 워크스페이스 생성, 고객·품목 관리 화면 |
| 3주 | 청구서 CRUD 완성 | 청구서 생성·목록·상세·상태변경 |
| 4주 | 견적서·신용전표 + 대시보드 | 전체 탭 동작, 통계 View 연결 |
| 5주 | 멀티 사용자 (Phase 2) | 초대 플로우, 역할 권한, 워크스페이스 전환 |
| 6주 | PDF + 공유링크 (Phase 3) | PDF 출력, 토큰 기반 공개 URL |
| 7주 | 이메일 발송 + 반복청구서 | Resend 연동, 복사 생성 기능 |
| 8주 | QA + 배포 + 랜딩 페이지 | handyinvoice.kr 오픈 |

---

## 8. 첫 번째 작업 체크리스트

```
□ Supabase 프로젝트 생성 (Free 티어)
□ Google OAuth 설정 (Supabase Auth → Providers)
□ supabase/migrations/001_initial.sql 실행
□ RLS 정책 활성화 확인
□ npm create vite@latest handyinvoice -- --template react-ts
□ @supabase/supabase-js tailwindcss zustand react-router-dom 설치
□ src/lib/supabase.ts 초기화
□ .env.local 작성
□ Vercel 연결 + 환경변수 등록
□ 로그인 페이지 → 워크스페이스 생성 플로우 완성
```

---

## 9. 오픈 이슈 / 결정 보류 항목

| 이슈 | 옵션 A | 옵션 B | 결정 시점 |
|------|--------|--------|-----------|
| PDF 생성 방식 | react-pdf (클라이언트) | Supabase Edge Function + puppeteer (서버) | Phase 3 시작 시 |
| 청구서 번호 채번 | 프론트에서 MAX+1 | DB 시퀀스/트리거 | 1주차 |
| 모바일 지원 | 반응형 웹 | 별도 앱 | 오픈 후 피드백 |
| 세금계산서 연동 | 직접 개발 | 단순 링크 안내 | Phase 4 |

---

_last updated: 2026-04-08_
