# Budget Manager Reference Directory [v4 / 굴비쥬스가계부]

이 디렉토리는 사용자의 기존 핵심 빌드버전(GULBZZUS Budget v4)과 관련된 과거 고민과 세부 연동, 완벽한 UI 구성을 담고있는 파일들의 개별 reference 데이터 저장소입니다.  
9,000줄이 넘는 원본 문서(`gulbzzus_budget_manager.md`)를 기능별/파일별로 쪼개어, 새로운 공유 기능 및 개선 기능 개발 시 아주 빠르게 참고/조회(index 처럼 사용)할 수 있도록 구조화하였습니다.

---

## 📂 Reference 파일 인덱스

### ⚙️ 핵심 애플리케이션 및 서비스 레이어
1. **[App.tsx](./App.tsx)**
   - 가계부의 메인 엔트리 역할을 수행하며, 테마 변경 및 계정 정보 동기화, 모드('default' / 'gulbi') 결정 및 GoogleSheets 연동의 전반적 오케스트레이션 로직을 담당합니다.
2. **[googleSheetsService.ts](./googleSheetsService.ts)**
   - Google Sheets API v4와 Google Drive v3와의 직접 동기화를 수행하는 핵심 데이터 통합 레이어입니다.
3. **[analysisUtils.ts](./analysisUtils.ts)**
   - 거래 내역(Transactions) 데이터 가공, 대시보드 구조화, 잔액 계산 및 동적 리포트에 필요한 순수 데이터 가공 로직입니다.
4. **[constants.ts](./constants.ts)**
   - 다양한 통장(말 통장 `🐴`), 시트 이름, API 범위 등 가계부 도메인의 각종 상수가 정의되어 있습니다.
5. **[types.ts](./types.ts)**
   - 가계부에 사용되는 모든 TypeScript 도메인 모델과 데이터 계약(`Transaction`, `Subscription`, `InvestmentItem` 등)이 선언되어 있습니다.
6. **[UIContext.tsx](./UIContext.tsx)**
   - 전역 스낵바 알림, Toast 메시징 등 공통 UI 상태를 주입하는 컨텍스트 레벨 모듈입니다.

### 🖼️ 주요 UI 페이지 및 컴포넌트
7. **[Layout.tsx](./Layout.tsx)**
   - 모바일 최적화 레이아웃(max-w-md, 아이폰 안전 영역) 및 동적으로 숨겨지는 스마트 헤더, 그리고 탭 전환 하단 네비게이션을 담고 있습니다.
8. **[Dashboard.tsx](./Dashboard.tsx)**
   - 도넛 차트(`DonutChart`), 타임라인 흐름(`flowData`), 수동 키워드 관리, 통장별 세부 정산 내역 바텀시트, 말 통장 동기화 등 대형 분석 대시보드 컴포넌트입니다.
9. **[Input.tsx](./Input.tsx)**
   - 수입, 지출, 계좌 간 이동 등록을 위한 빠른 트랜잭션 전처리 폼 카드 컴포넌트입니다.
10. **[History.tsx](./History.tsx)**
    - 필터, 정렬, 상세 모달 UI, 트랜잭션 삭제 및 수정, 상세 이미지 업로드와 미리보기 바운딩을 관리하는 히스토리 목록 화면입니다.
11. **[Investments.tsx](./Investments.tsx)**
    - 자산 분배, 종목별 누적 단가 대비 수익률, 채권/금/달러 환율 연계 연동 등 고정 자산 투자 관리 지표입니다.
12. **[Subscriptions.tsx](./Subscriptions.tsx)**
    - 고정 지출인 정기 결제 항목, 주기 설정, 카테고리별 합산 추적이 가능한 구독 서비스 관리 영역입니다.
13. **[Settings.tsx](./Settings.tsx)**
    - 통장 관리, 숨길 항목 관리, 기준일 관리, 설정 조정 페이지입니다.

### 🐍 백엔드 및 가상화 / 구성 파일
15. **[metadata.json](./metadata.json)**
    - AI Studio 프레임 및 메이저 역량 선언 파일입니다.
16. **[vite.config.ts](./vite.config.ts)**, **[tsconfig.json](./tsconfig.json)**, **[package.json](./package.json)**
    - 전반적인 번들링, 모듈 해석 환경, 빌드 가상 환경 디펜던시 구성 파일들입니다.
17. **[RUN_LOCALLY.md](./RUN_LOCALLY.md)**, **[README_original.md](./README_original.md)**
    - 원본 빌드의 설치 가이드, 배포 시 설정할 로컬 환경 변수 등 매뉴얼 정보입니다.
18. **[script.py](./script.py)**
    - 원본 프로젝트에 포함되어 있던 백엔드/매니지먼트용 Python 스크립트 홀더입니다.

---

## 🛠️ 활용 가이드 (How to Reference)

- **UI 커스터마이징 시**: Layout, Dashboard 등 이미 검증된 반응형 세부 속성(Tailwind CSS, SVG direct icons)을 확인하려면 관련 컴포넌트 마크다운이나 코드 파일을 직접 바로 읽으세요.
- **비즈니스 로직 수정 시**: `analysisUtils.ts` 및 `types.ts`를 조회하여 가계부 데이터 형식과 셈법 연산의 규칙을 유지하십시오.
