/// <reference types="vite/client" />

// Configuration for Google Sheets API
export const DEFAULT_SPREADSHEET_ID = '';
export const DEFAULT_DRIVE_FOLDER_ID = ''; 

export const GULBI_SPREADSHEET_ID = '';
export const GULBI_DRIVE_FOLDER_ID = '';

export const SHEET_NAMES = {
  RECORDS: '가계부 기록',
  SUBCATEGORIES: '세부 카테고리 관리',
  ACCOUNTS: '통장/카드 관리',
  INCOME_SOURCES: '수입처 관리', 
  MANAGED_ACCOUNTS: '대시보드 통장 관리',
  TEMPLATE: '템플릿',
  FIXED_KEYWORDS: '고정 키워드 관리',
  BUDGET_VISIBILITY: '예산 지표 숨김 관리',
  SUBSCRIPTIONS: '구독 관리',
  INVESTMENTS: '투자 관리',
  INVESTMENT_GOALS: '투자 목표 관리',
  INVESTMENT_ACCOUNT_TYPES: '투자 계좌 유형 관리',
  INVESTMENT_BROKERS: '투자 구매처 관리',
  INVESTMENT_STOCK_CODES: '투자 종목코드 관리',
  INVESTMENT_ACCOUNTS: '투자 계좌 관리',
  INVESTMENT_ANNUAL_RETURNS: '투자 연도별 수익률 관리',
  SUBSCRIPTION_TAGS: '구독 태그 관리',
  CHECKLIST: '개발 체크리스트',
  TODO_GROUPS: '할일 그룹 관리',
  TODO_ITEMS: '할일 세부 항목',
  ASSET_PLANS: '자산운영계획',
  SETTINGS: '설정 관리'
};

// Google API Configuration
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;


// OAuth Scopes
export const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

// Discovery Docs
export const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

export const ADMIN_EMAIL = "jeonyounggwang@gmail.com";

export const ALLOWED_EMAILS = [
  "jeonyounggwang@gmail.com",
  "lee.zzu.hee@gmail.com"
];

export const CATEGORIES = ['🚨지출', '💰수입', '⚖️잔액조정', '➡️이동'];
export const SETTLEMENT_OPTS = ['🟠 대기', '⚫️ 보류', '🟢 완료', '⚪️ N/A'];

// 동기화 대상 🐴 계정 리스트
export const HORSE_ACCOUNTS = [
  '🐴현카(하나)',
  '🐴토스',
  '🐴하나',
  '🐴카카오',
  '🐴 신한(하나)'
];

// Default Fallbacks if sheets are empty
export const SUBSCRIPTION_TAGS = ['📺 OTT', '🛍️ 쇼핑', '🎵 음악', '☁️ 클라우드', '💪 운동', '💻 업무', '🏠 생활', 'ETC 기타'];
export const RENEWAL_CYCLES = ['매월', '매년', '매주', '분기별'];

// Investment Constants
export const INVESTMENT_CATEGORIES = ['ETF', '채권', '금', '달러', '주식', '세븐스플릿'];
