# GULBZZUS Design System

## 1. Aesthetic Recipe: "Apple iOS Modern Minimalist"
- **Vibe**: Apple 특유의 절제미와 고급스러움을 담은 현대적인 금융 서비스 인터페이스.
- **Mood**: 극도의 간결함, 풍부한 여백, 부드러운 라운딩 처리, 정교한 그림자와 블러 효과.

## 2. Typography
- **Primary**: 'Inter', sans-serif (UI 요소 전체)
- **Display**: 'Inter', sans-serif (Bold 700+ for Headings)
- **Data**: 'Inter', sans-serif (Medium/Bold for Amounts)
- **Mono**: 'JetBrains Mono' (계좌/기술적 텍스트 용도)

## 3. Color Palette (Apple Palette)
- **Primary (Link/Action)**: Apple Blue (#007AFF)
- **Text Main**: San Francisco Black (#1D1D1F)
- **Text Secondary**: San Francisco Gray (#86868B)
- **Background**: Soft Gray (#F5F5F7)
- **Card/Surface**: Pure White (#FFFFFF)
- **Success/Income**: Emerald (#34C759)
- **Destructive/Expense**: Coral (#FF3B30)

## 4. Components & Layout Standards (The "5.0" Update)
- **Layout**: Header는 `z-[50]` 이상으로 배치하여 컨텍스트 메뉴나 모달 위에 항상 보이게 함.
- **Cards**: `rounded-[2rem]` (32px) 적용. 부드럽고 깊은 그림자 (`shadow-[0_2px_12px_rgba(0,0,0,0.04)]`) 사용.
- **Interactive Elements (Inputs/Buttons)**: 
    - **Height**: `h-14` (56px)로 통일하여 시인성과 터치 정확도 극대화.
    - **Radius**: `rounded-[1.25rem]` (20px)로 통일하여 일관성 유지.
    - **Font Weight**: 버튼은 `font-bold`를 사용하여 명확한 행동 유도.
- **Lists (BottomSheet)**: 리스트 항목은 `h-14` 높이와 `px-5` 패딩을 기본으로 하며, 항목 간 영역 구분을 위해 배경색(`bg-[#F5F5F7]`)을 기본 적용하고, 선택된 항목은 스카이블루톤(`bg-[#EBF5FF]`)으로 강조하여 직관성을 높임. 그림자 효과는 배제하여 깔끔한 플랫 디자인 유지.

## 5. UI Consistency Standards (in index.css)
- **.theme-card**: `bg-white rounded-[2rem] border border-[#E5E5E7] shadow-sm`
- **.theme-input**: `h-14 px-5 bg-[#F5F5F7] rounded-[1.25rem] text-sm font-medium transition-all`
- **.theme-btn-primary**: `h-14 px-6 bg-[#007AFF] text-white rounded-[1.25rem] font-bold shadow-lg shadow-[#007AFF]/20 transition-all`
- **.theme-btn-secondary**: `h-14 px-6 bg-[#F5F5F7] text-[#1D1D1F] rounded-[1.25rem] font-bold transition-all`

## 6. Interaction & Motion
- **Bottom Sheet Implementation**: 
    - `fixed inset-0 flex items-end justify-center sm:items-center` 구조 사용.
    - 상단 핸들바(`w-10 h-1 bg-gray-100 rounded-full`) 배치 필수.
    - `p-8` 기본 패딩으로 시원한 레이아웃 제공.
    - `AnimatePresence`와 `motion.div`를 통한 `y: "100%" -> 0` 트랜지션.
- **Dynamic List Editor**: 추가 버튼과 입력창의 높이를 일치시키고, 리스트 아이템 내부의 편집/삭제 버튼은 `w-9 h-9` 크기의 아이콘 버튼으로 표준화.
