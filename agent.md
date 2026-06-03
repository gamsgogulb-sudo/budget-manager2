# GULBZZUS AI Coding Agent Instructions

## 1. Role
당신은 GULBZZUS 서비스를 개발하는 수석 풀스택 개발자입니다. 사용자의 직관적인 자산 관리를 최우선으로 생각하며, 코드의 안정성과 확장성을 중시합니다.

## 2. Core Principles
- **Firebase First**: 실시간 동기화와 공유 기능을 위해 Firebase를 주요 백엔드로 사용합니다.
- **Clean Architecture**: 컴포넌트는 재사용 가능하게 분리하고, 비즈니스 로직은 Hook이나 Service 레이어로 격리합니다.
- **Design System First**: `index.css`의 `theme-*` 클래스를 활용하여 파편화된 스타일을 지양하고 통일된 UI(`h-14`, `rounded-2rem/1.25rem`)를 유지합니다.
- **UI/UX**: `design.md`의 "Apple iOS Modern Minimalist" 원칙을 준수하여 고급스러운 UI를 제공합니다.

## 3. Implementation Workflow
- 새로운 기능을 추가하기 전 항상 `planning.md`를 확인하여 현재 단계를 확인합니다.
- UI 수정 시 `design.md`에 정의된 색상과 타이포그래피를 사용합니다.
- 복잡한 데이터 처리는 `utils` 또는 `services`로 분리합니다.

## 4. Current Core Features & Architecture Snippets

리팩토링이나 디자인 개편 시 아래 기능적 아키텍처가 손상되지 않도록 주의하십시오.

### 4.1. Data Models (src/types/index.ts)
```typescript
export type TransactionType = 'income' | 'expense' | 'balance_adj' | 'transfer';
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  subCategory: string;
  paymentMethod: string; // From Account
  memo: string;
  date: string; // ISO String
  settlementStatus: string; // '대기', '완료', '보류', 'N/A'
  photoUrls?: string[];
  transferId?: string;
  settledFromAccount?: string;
  settledToAccount?: string;
  ownerId: string;
}
```

### 4.2. Unified Date & Period Selection
Dashboard와 Transactions(내역) 페이지 간의 UI 일관성을 위해 공통 컴포넌트를 사용합니다.
- `PeriodSelector`: 프리셋(7일, 이번달 등) 및 직접 기간 설정(Custom)을 처리합니다.
- `DateNavHeader`: 월간/주간 전환, 월 이동(prev/next), 가로형 날짜 그리드(Scroller)를 통합 제공합니다.
  - `showViewToggle`: Dashboard 등에서 월간/주간 전환 버튼을 숨기고 싶을 때 `false`로 설정합니다.
  - `showCalendar`: Dashboard 등에서 날짜 그리드(달력)를 숨기고 네비게이션만 쓰고 싶을 때 `false`로 설정합니다.
  - **동기화**: `onViewDateChange`를 통해 헤더의 navigation(화살표)과 페이지의 데이터 필터링 기간을 동기화합니다.
- `getRangeFromPeriod`: 선택된 PeriodType에 따른 실제 `start/end` 날짜 객체를 반환하는 유틸리티입니다.

```typescript
// Dashboard & Transactions 공통 사용 패턴
<DateNavHeader 
  currentViewDate={currentViewDate}
  onViewDateChange={setCurrentViewDate}
  isMonthlyView={isMonthlyView}
  selectedDate={selectedDate}
  onSelectedDateChange={handleDateClick}
  dateRange={currentRange}
  onPeriodClick={() => setIsOpen(true)}
/>
```

### 4.3. Balance Calculation & Dashboard Metrics
가장 최근의 `balance_adj`를 기점으로 이후의 트랜잭션을 합산하여 계좌별 실시간 잔액을 계산하며, Dashboard에서는 기간별(7일/30일/이번달/지난달/직접 설정) 지출/수입 추이를 AreaChart로 시각화합니다.
```typescript
// 직접 설정(Custom) 기간 처리
const dateRange = useMemo(() => {
  if (period === 'custom') {
    return { 
      start: startOfDay(parseISO(customRange.start)), 
      end: endOfDay(parseISO(customRange.end)) 
    };
  }
  // ... 프리셋 처리
}, [period, customRange]);

// 계좌별 실시간 잔액 계산 (전체 내역 기반)
const accountStates = useMemo(() => {
  const balances: Record<string, number> = {};
  // ... 모든 계좌 순회 및 lastAdj 이후 합산 로직
  return balances;
}, [transactions]);
```

### 4.3. Transaction Filtering & Search
다중 필터링 조건을 결합하여 클라이언트 측에서 처리하며, Dashboard와 Transactions 페이지에서 각각 용도에 맞는 필터를 제공합니다.
다중 필터링 조건을 결합하여 클라이언트 측에서 처리하며, `dateRange` 유무에 따라 조기 필터링 로직이 분기됩니다.
```typescript
const filteredTransactions = useMemo(() => {
  return transactions.filter(t => {
    const tDate = parseISO(t.date);
    // Date Matching: 기간 설정이 있으면 범위 내, 없으면 선택된 날짜와 일치 여부 확인
    const matchesDate = dateRange 
      ? isWithinInterval(tDate, { start: dateRange.start, end: dateRange.end })
      : isSameDay(tDate, selectedDate);
    const searchStr = `${t.memo} ${t.subCategory || ''} ${t.paymentMethod}`.toLowerCase();
    const matchesSearch = searchTerm === '' || searchStr.includes(searchTerm.toLowerCase());
    const matchesType = filters.types.length === 0 || filters.types.includes(t.type);
    const matchesStatus = filters.settlementStatuses.length === 0 || filters.settlementStatuses.includes(t.settlementStatus || 'N/A');
    return matchesDate && matchesSearch && matchesType && matchesStatus;
  });
}, [transactions, searchTerm, filters, selectedDate, dateRange]);
```

### 4.4. Google Drive Integration (googleDriveService.ts)
사용자의 구글 드라이브에 전용 폴더를 생성하고 영수증 이미지를 업로드/다운로드합니다. 파일 조회 시 Private 링크 대신 API를 통해 Blob으로 다운로드하여 `URL.createObjectURL`로 브라우저에 표시합니다.
```typescript
export async function downloadDriveFile(accessToken: string, fileId: string): Promise<Blob> {
  const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return await response.blob();
}
```

### 4.5. Excel Export (Transactions.tsx)
`xlsx` 라이브러리를 사용하여 모든 필드를 포함한 엑셀 파일을 생성하며, 컬럼 너비를 데이터 특성에 맞게 조정합니다.
```typescript
const handleDownloadExcel = () => {
  const data = transactions.map(t => ({
    '입력시간': formatDate(t.createdAt || t.date),
    '카테고리': t.category,
    '세부 카테고리': t.subCategory || '',
    '비용': t.amount,
    '통장/카드': t.paymentMethod,
    '세부정보': t.memo,
    '실행일': formatDate(t.date),
    '정산 상태': t.settlementStatus || '',
    '🐴🐭': t.marker ? 'O' : 'X',
    '업로드 사진 링크': [t.photoUrl || '', ...(t.photoUrls || [])].filter(Boolean).join(', '),
    '고유ID': t.id,
    '이동ID': t.transferId || '',
    '정산한통장': t.settledFromAccount || '',
    '정산받은통장': t.settledToAccount || '',
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  worksheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 30 }]; // 주요 컬럼 너비 지정
  XLSX.writeFile(workbook, `GULBZZUS_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
};
```

### 4.6. Real-time Firebase Sync (transactionService.ts)
`onSnapshot`을 통해 실시간으로 데이터 변화를 감지합니다.
```typescript
export function subscribeTransactions(ledgerId: string, callback: (transactions: Transaction[]) => void) {
  const q = query(collection(db, `ledgers/${ledgerId}/transactions`), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(transactions as Transaction[]);
  });
}
```

### 4.7. Auth & Access Token (AuthContext.tsx)
Firebase Auth와 Google Drive API를 위한 Access Token 관리를 병합하여 사용합니다.
- `signInWithPopup(googleProvider)` 사용 시 `GoogleAuthProvider.credentialFromResult`를 통해 Access Token을 획득하여 `localStorage`에 보관 및 `context`에서 공유합니다.

### 4.8. Settlement Status Workflow (TransactionModal.tsx)
정산 상태가 '완료'일 경우 추가적인 계좌 정보(정산한 통장, 정산받은 통장)를 입력받는 조건부 로직입니다.
```typescript
{formData.settlementStatus === '완료' && (
  <div className="grid grid-cols-2 gap-4">
    <select value={formData.settledFromAccount} ... />
    <select value={formData.settledToAccount} ... />
  </div>
)}
```

### 4.9. Dynamic List Management (DynamicListEditor.tsx)
통장/카드 및 세부 카테고리를 독립적인 컬렉션으로 관리하며, 즐겨찾기(Favorite) 기능을 통해 모달 상단에 우선적으로 노출합니다.
```typescript
// transactionService.ts
export async function addSubCategory(ledgerId: string, userId: string, name: string) {
  const path = `ledgers/${ledgerId}/subCategories`;
  return await addDoc(collection(db, path), { name, ownerId: userId, isFavorite: false });
}
```

### 4.10. Multi-Ledger & Shared Access (LedgerContext.tsx)
개인용/공유용 가계부를 생성하고 전환할 수 있으며, 공유 가계부는 초대된 멤버 전원이 실시간으로 데이터를 공유합니다.
- **UI Styling (LedgerSwitcher)**: 가계부 선택 시 가독성을 위해 선택된 가계부는 `bg-[#EBF5FF]`(스카이블루), 선택되지 않은 가계부는 `bg-[#F5F5F7]`(라이트 그레이) 배경색을 적용하여 클릭 영역을 명확히 구분합니다.
```typescript
// LedgerContext.tsx - 가계부 전환 시 localStorage와 State 동기화
const switchLedger = (id: string) => {
  setCurrentLedgerId(id);
  localStorage.setItem('momoney_current_ledger_id', id);
};
```

### 4.11. Dashboard Statistics & Charts (Dashboard.tsx)
`recharts`를 사용하여 카테고리별 지출 비율(PieChart)과 수입/지출 현금 흐름(BarChart)을 시각화합니다.
```typescript
const categoryData = transactions
  .filter(t => t.type === 'expense')
  .reduce((acc, t) => {
    const existing = acc.find(item => item.name === t.category);
    if (existing) existing.value += t.amount;
    else acc.push({ name: t.category, value: t.amount });
    return acc;
  }, []);
```

### 4.12. Transfer Logic between Accounts (Dashboard.tsx)
이체(transfer) 타입의 경우 `paymentMethod`(출금 계좌)와 `settledToAccount`(입금 계좌) 양쪽의 잔액에 반대 방향으로 영향을 미칩니다.
```typescript
if (t.paymentMethod === accName) {
  if (t.type === 'transfer') currentBal -= t.amount; // 출금
} else if (t.type === 'transfer' && t.settledToAccount === accName) {
  currentBal += t.amount; // 입금
}
```

### 4.13. Image Preview & Drive Handling (TransactionModal.tsx)
이미지 업로드 시 Drive API로 저장하고, 조회 시에는 `downloadDriveFile`을 통해 Blob을 받아 `URL.createObjectURL`로 브라우저에 표시합니다.
```typescript
// UI에서 이미지 제거 및 처리
const handleRemovePhoto = (index: number) => {
  setFormData(prev => ({
    ...prev,
    photoUrls: prev.photoUrls?.filter((_, i) => i !== index)
  }));
};
```

### 4.14. Automatic Onboarding (LedgerContext.tsx)
가계부가 하나도 없는 신규 사용자가 로그인 시, '개인 가계부'를 자동으로 생성하여 즉시 사용 가능한 상태로 만듭니다.
```typescript
if (ledgerList.length === 0) {
  setLoading(true);
  await createLedger(`${user.displayName || '개인'} 가계부`, 'personal');
}
```

### 4.15. Smart Invitation & Member Sync (LedgerContext.tsx)
이메일로 멤버를 초대하며, 초대된 사용자가 나중에 가입하더라도 가입 즉시 초대된 가계부에 자동으로 합류(UID 동기화)됩니다.
```typescript
// LedgerContext.tsx - 로그인 시 초대 목록 확인 및 UID 업데이트
useEffect(() => {
  if (user && ledgers.length > 0) {
    ledgers.forEach(async (ledger) => {
      if (ledger.memberEmails.includes(user.email!) && !ledger.members.includes(user.uid)) {
        await updateDoc(doc(db, 'ledgers', ledger.id), { members: arrayUnion(user.uid) });
      }
    });
  }
}, [user, ledgers]);
```

### 4.16. Horizontal Calendar & Period Range Filter (Transactions.tsx)
내역 메뉴의 상단에는 주간/월간 전환 가능한 수평 캘린더와 '기간 설정' 기능이 포함되어 있습니다. 
- **수평 캘린더**: `date-fns`를 사용하여 현재 뷰의 시작일로부터 7일(주간) 또는 한 달 전체(월간) 그리드를 생성합니다.
- **일별 요약**: `useMemo`를 통해 트랜잭션을 날짜별로 그룹화하여 캘린더 각 날짜 하단에 수입(+)과 지출(-) 요약을 표시합니다.
- **금액 포맷팅**: 캘린더 내 좁은 공간을 위해 1,000단위(천)와 10,000단위(만)로 축약하여 표시하는 `formatVal` 함수를 사용합니다.
- **기간 설정**: `dateRange` 상태가 존재할 경우 특정 일자가 아닌 지정된 범위를 기준으로 트랜잭션을 필터링합니다. 

### 4.17. Bottom Sheet UI & Animation Bug Prevention (TransactionModal.tsx)
모바일 환경에서 모달이 화면 하단에서 부드럽게 올라오도록 하는 핵심 구조입니다. 이 구조가 깨지면 모달이 화면 중앙에서 뜨는 버그가 발생할 수 있습니다.
- **부모 컨테이너**: `fixed inset-0 flex items-end justify-center`를 사용하여 하단 정렬을 보장합니다 (`sm:` 모드에서는 `items-center`로 중앙 정렬).
- **애니메이션**: `motion.div`의 `initial={{ y: "100%" }}`과 `exit={{ y: "100%" }}`을 사용하여 실제 슬라이드 효과를 구현합니다.
```typescript
// TransactionModal.tsx 구조 예시
<AnimatePresence>
  {isOpen && (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center ...">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40" 
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl bg-white rounded-t-[2.5rem] ..."
      >
        {/* Content */}
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

### 4.18. Ledger Management & Deletion Safety (Config.tsx)
가계부 목록에서 각 항목별로 즉시 이름 수정, 전환(Landing), 삭제가 가능합니다. 우발적 삭제를 방지하고 최소한의 데이터 가용성을 보장하기 위한 로직이 포함되어 있습니다.
- **Inline Editing**: 리스트 아이템 내부에서 `editingLedgerId`를 통해 즉시 이름을 변경할 수 있습니다.
- **Landing Action**: `ExternalLink` 아이콘을 통해 선택된 가계부로 즉시 전환하고 대시보드로 이동합니다.
- **Deletion Safety**: 
  - 가계부 삭제 시 컨펌 모달을 통해 재확인합니다.
  - 사용자는 자신이 소유자(`ownerId` 또는 `ownerEmail` 일치)인 가계부만 삭제할 수 있습니다.
  - **최소 가계부 유지**: 사용자가 최소 1개의 가계부(Home)를 유지해야 하므로, 마지막 가계부의 휴지통 아이콘은 비활성화(`opacity-30`, `cursor-not-allowed`) 및 `disabled` 처리됩니다.

## 5. Work History
- **2026-05-16**: 템플릿 관리(BatchInputList) 페이지의 디버그 기능(실시간 로그 모니터 등)을 제거하고, 정상적인 UI(수정, 즉시 실행 버튼)를 복구하였습니다. `window.confirm`과 `alert`이 iframe 환경에서 차단될 수 있는 문제를 해결하기 위해 이를 제거하고 개별 삭제 버튼에 `preventDefault`, `stopPropagation` 및 `TouchEvent` 대응을 추가하여 삭제 기능을 정상화하였습니다. 수정 기능 및 일괄 적용 기능도 정상적으로 복구되었습니다.
- **2026-05-16**: 사용자의 요청에 따라 "한번에 입력하기" 기능을 단일 템플릿 모델로 단순화하였습니다. 여러 개의 템플릿 리스트를 보여주는 대신, 하나의 마스터 템플릿을 즉시 실행하거나 수정할 수 있는 대시보드 형태로 UI를 개편하였습니다. 템플릿 편집 시에도 이름을 입력하는 과정을 생략하여 사용성을 개선하였습니다.
- **2026-05-16**: "한번에 입력하기"의 핵심 기능을 설정(Config) 페이지로 완전히 통합하였습니다. 별도의 하위 리스트 페이지 이동 없이 설정 화면에서 즉시 템플릿을 실행하고 수정할 수 있는 컴플라이언스 디자인을 적용하였으며, 기존의 `theme-card` 및 리스트 아이템 UI 컴포넌트를 재활용하여 앱 전체의 시각적 통일성을 확보하였습니다.
- **2026-05-17**: 더 이상 사용되지 않는 `BatchInputList.tsx` 페이지와 해당 라우트를 완전히 삭제하였습니다. 템플릿 편집 및 생성 후 설정 페이지로 직접 돌아가도록 내비게이션 로직을 수정하였습니다.
- **2026-05-17**: 템플릿 구성(`BatchSetEditor`) 페이지의 UI를 개선하였습니다. 기존의 고정형 하위 버튼들을 제거하고, 항목 추가는 우측 하단 플로팅 버튼(FAB)으로, 저장은 상단 헤더의 디스크 아이콘 버튼으로 통합하여 화면 공간을 효율적으로 활용하도록 변경하였습니다. 또한 편집 중 집중도를 높이기 위해 해당 페이지에서는 하단 플로팅 네비게이션 바가 표시되지 않도록 수정하였습니다. 저장 버튼 클릭 시 설정 페이지로 나가는 대신 해당 페이지에 유지되며 스낵바를 통해 저장 결과를 알리도록 개선하였습니다.
- **2026-05-17**: 템플릿 항목 관리 방식을 리스트형 UI로 개편하고 `TransactionModal` 공통 컴포넌트를 연동하였습니다. 개별 항목 카드를 직접 편집하는 방식에서 벗어나, 내역 메뉴와 동일한 리스트 스타일을 적용하고 항목 추가/수정 시 공통 바텀시트(모달)를 사용하도록 하여 앱 전체의 사용 경험(UX)을 일관성 있게 통일하였습니다.
