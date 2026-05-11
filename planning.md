# GULBZZUS Development Plan & Roadmap

## 1. 개요
GULBZZUS는 단순한 지출 기록을 넘어, 개인과 공동체의 자산을 효율적으로 관리하고 투자 현황까지 한눈에 파악할 수 있는 올인원 가계부 서비스입니다.

## 2. 개발 단계 (Phases)

### Phase 1: MVP & UI Foundation (Completed)
- **기초 아키텍처**: React + Tailwind CSS + Firebase(Auth/Firestore) 설정 완료
- **디자인 시스템**: Apple iOS 스타일 테마화 및 `theme-*` 클래스 표준화 완료
- **기본 가계부**: 지출/수입 CRUD 및 실시간 동기화 구현 완료
- **다중 가계부**: 개인용/공유용 가계부 생성 및 전환 기능 완료
- **파일 관리**: Google Drive 연동 영수증 업로드 및 미리보기 완료

### Phase 2: 핵심 모듈 확장 (In Progress)
- **통계 고도화**: Recharts 기반의 기간별 소득/지출 분석 및 리포트 (Dashboard 개선)
- **잔액 관리 최적화**: 이체 및 자산 조정(Adjustment) 로직 고도화
- **UX 개선**: 거래 내역 필터링 속도 및 일별 요약 캘린더 인터페이스 최적화
- **UI 고도화**: 가계부 전환기(LedgerSwitcher) 시각적 피드백 강화 (선택 상태 스카이블루 강조)

### Phase 3: 외부 연동 및 고도화
- **Google Sheets Sync**: Firestore 데이터를 구글 시트와 동기화
- **Google Drive 업로드**: 영수증 및 사진 파일 관리
- **템플릿 & 체크리스트**: 반복 지출 템플릿 및 자산 관리 체크리스트 기능

### Phase 4: 지능형 서비스 (Lab)
- **AI 모듈**: AI 기반 카테고리 자동 분류 및 소비 패턴 분석 안내 (Gemini API 활용)
- **공유 동기화 심화**: 사용자 초대 및 시트 기준 실시간 동기화 로직 완성

## 3. 기능 명세 세부점검
- **입력 양식**: 날짜, 금액, 카테고리, 메모, 결제 수단, 대상(개인/공유)
- **투자 모듈**: 각 종목별 수익금 및 현재가 기준 수익률 (Mock API -> Real API)
- **공유 메커니즘**: Firestore의 `ownerId` 및 `sharedWith` 필드를 활용한 접근 제어

---
*이 문서는 개발 진행 상황에 따라 업데이트됩니다.*
