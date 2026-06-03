import { 
    DEFAULT_SPREADSHEET_ID, 
    DEFAULT_DRIVE_FOLDER_ID, 
    GULBI_SPREADSHEET_ID, 
    GULBI_DRIVE_FOLDER_ID,
    SHEET_NAMES, 
    SCOPES, 
    DISCOVERY_DOCS, 
    GOOGLE_CLIENT_ID, 
    ALLOWED_EMAILS,
    HORSE_ACCOUNTS
} from '../constants';
import { Transaction, FixedKeyword, Subscription, InvestmentItem, InvestmentGoal, ChecklistItem, TodoItem, TodoGroup, AssetPlan, Tab, SalaryTemplateItem } from '../types';

// Global types for Google API
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface UserProfile {
    name: string;
    email: string;
    picture: string;
}

let tokenClient: any;
let isGapiInitialized = false;
let isGisInitialized = false;
let isTestMode = false;

// Dynamic Configuration State
let currentSpreadsheetId = DEFAULT_SPREADSHEET_ID;
let currentFolderId = DEFAULT_DRIVE_FOLDER_ID;

export const setConfig = (mode: 'default' | 'gulbi') => {
    if (mode === 'gulbi') {
        currentSpreadsheetId = GULBI_SPREADSHEET_ID;
        currentFolderId = GULBI_DRIVE_FOLDER_ID;
        console.log("Switched to GULBI Config");
    } else {
        currentSpreadsheetId = DEFAULT_SPREADSHEET_ID;
        currentFolderId = DEFAULT_DRIVE_FOLDER_ID;
        console.log("Switched to Default Config");
    }
};

export const getCurrentSpreadsheetUrl = () => {
    return `https://docs.google.com/spreadsheets/d/${currentSpreadsheetId}`;
};

// --- Sync Helper Logic (RESTORED & FORMATTED) ---

const findRowIndexById = async (spreadsheetId: string, uniqueId: string): Promise<number | null> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: `'${SHEET_NAMES.RECORDS}'!L2:L` 
        });
        const ids = (response.result.values || []).flat();
        const index = ids.indexOf(uniqueId);
        return index !== -1 ? index + 2 : null;
    } catch (e) {
        return null;
    }
};

const upsertRowInSheet = async (spreadsheetId: string, data: Omit<Transaction, 'rowIndex'>) => {
    const existingRowIndex = await findRowIndexById(spreadsheetId, data.uniqueId);
    
    const row = [
        data.inputTime || new Date().toISOString(), 
        data.category, 
        data.subcategory, 
        data.cost, 
        data.account, 
        data.note, 
        data.date, 
        data.settlement, 
        "", "", "", 
        data.uniqueId, 
        data.transferId || "",
        data.settlementFromAccount || "", 
        data.settlementToAccount || "",
        data.incomeSource || "" 
    ];

    try {
        if (existingRowIndex) {
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: `'${SHEET_NAMES.RECORDS}'!A${existingRowIndex}:P${existingRowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [row] }
            });
        } else {
            await window.gapi.client.sheets.spreadsheets.values.append({ 
                spreadsheetId: spreadsheetId, 
                range: `'${SHEET_NAMES.RECORDS}'!A1`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: [row] } 
            });
        }
    } catch (e) {
        console.error("[Sync] Upsert failed", e);
    }
};

const syncToGulbiIfHorse = async (data: Omit<Transaction, 'rowIndex'>, sourceSpreadsheetId: string) => {
    if (sourceSpreadsheetId !== DEFAULT_SPREADSHEET_ID || isTestMode) return;
    
    // 1. 주 계좌가 Horse 계정인 경우 동기화
    if (HORSE_ACCOUNTS.includes(data.account)) {
        await upsertRowInSheet(GULBI_SPREADSHEET_ID, data);
    }
    
    // 2. 정산받은 통장이 Horse 계정인 경우, 해당 계정의 수입으로 동기화 (가상 정산 반영)
    if (data.settlementToAccount && HORSE_ACCOUNTS.includes(data.settlementToAccount)) {
        const syncIncomeId = `INC_SYNC_${data.uniqueId}`;
        const convertedIncome: Omit<Transaction, 'rowIndex'> = {
            ...data,
            uniqueId: syncIncomeId,
            category: '💰수입',
            subcategory: '정산수입(자동)',
            account: data.settlementToAccount,
            cost: Math.abs(data.cost),
            note: `[자동정산] ${data.note || data.subcategory}`,
            settlement: '🟢 완료',
            settlementFromAccount: '', 
            settlementToAccount: '',
            incomeSource: '정산' 
        };
        await upsertRowInSheet(GULBI_SPREADSHEET_ID, convertedIncome);
    }
};

// --- Mock Data (RESTORED & ENRICHED) ---
const generateMockDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
};

let mockTransactions: Transaction[] = [
    { 
        uniqueId: 'M1', 
        inputTime: new Date().toISOString(), 
        category: '💰수입', 
        subcategory: '월급', 
        cost: 3500000, 
        account: '🐴토스', 
        note: '5월 정기 월급', 
        date: generateMockDate(15), 
        settlement: '🟢 완료', 
        rowIndex: 2 
    },
    { 
        uniqueId: 'M2', 
        inputTime: new Date().toISOString(), 
        category: '🚨지출', 
        subcategory: '식비', 
        cost: -15000, 
        account: '🐴카카오', 
        note: '점심 (김치찌개)', 
        date: generateMockDate(1), 
        settlement: '🟢 완료', 
        rowIndex: 3 
    },
    { 
        uniqueId: 'M3', 
        inputTime: new Date().toISOString(), 
        category: '🚨지출', 
        subcategory: '교통', 
        cost: -2500, 
        account: '🐴토스', 
        note: '버스비', 
        date: generateMockDate(0), 
        settlement: '🟢 완료', 
        rowIndex: 4 
    },
    { 
        uniqueId: 'M4', 
        inputTime: new Date().toISOString(), 
        category: '💰수입', 
        subcategory: '부업', 
        cost: 120000, 
        account: '🐭현금', 
        note: '중고거래 판매', 
        date: generateMockDate(2), 
        settlement: '🟢 완료', 
        rowIndex: 5 
    },
    { 
        uniqueId: 'M5', 
        inputTime: new Date().toISOString(), 
        category: '🚨지출', 
        subcategory: '생활비', 
        cost: -45000, 
        account: '🐴카카오', 
        note: '마트 장보기', 
        date: generateMockDate(5), 
        settlement: '🟠 대기', 
        rowIndex: 6 
    },
    { 
        uniqueId: 'M6', 
        inputTime: new Date().toISOString(), 
        category: '➡️이동', 
        subcategory: '이동(입금)', 
        cost: 500000, 
        account: '🐴토스', 
        note: '여유자금 이동', 
        date: generateMockDate(10), 
        settlement: '🟢 완료', 
        rowIndex: 7 
    },
    { 
        uniqueId: 'M7', 
        inputTime: new Date().toISOString(), 
        category: '🚨지출', 
        subcategory: '식비', 
        cost: -8500, 
        account: '🐴카카오', 
        note: '커피', 
        date: generateMockDate(0), 
        settlement: '🟢 완료', 
        rowIndex: 8 
    }
];

let mockSubscriptions: Subscription[] = [
    { id: 'S1', name: '넷플릭스', cost: 17000, cycle: '매월', paymentMethod: '🐴토스', startDate: '2024-01-01', tag: '📺 OTT', memo: '프리미엄 요금제', status: '구독', rowIndex: 2 },
    { id: 'S2', name: '유튜브 프리미엄', cost: 14900, cycle: '매월', paymentMethod: '🐴카카오', startDate: '2024-02-15', tag: '📺 OTT', memo: '광고 제거', status: '구독', rowIndex: 3 }
];
let mockAssetPlans: AssetPlan[] = [
    { id: 'AP1', title: '비상금 운영 방침', content: '급여의 10%는 무조건 비상금 통장으로 이체', date: '2024-01-01', tag: '운영방침', rowIndex: 2 }
];
let mockInvestments: InvestmentItem[] = [
    { id: 'I1', name: '삼성전자', broker: '한국투자', category: '주식', accountType: '일반', date: '2024-03-10', price: 72000, quantity: 10, totalCost: 720000, targetRatio: 20, targetPrice: 90000, actualPrice: 0, realizedProfit: 0, note: '장기 보유', stockCode: '005930', currentPrice: 75000, rowIndex: 2 },
    { id: 'I2', name: 'TIGER 미국S&P500', broker: '미래에셋', category: 'ETF', accountType: 'ISA', date: '2024-04-15', price: 15000, quantity: 100, totalCost: 1500000, targetRatio: 40, targetPrice: 20000, actualPrice: 0, realizedProfit: 0, note: 'ISA 계좌 운용', stockCode: '360750', currentPrice: 16500, rowIndex: 3 },
    { id: 'I3', name: 'KODEX 200', broker: '삼성증권', category: 'ETF', accountType: 'IRP', date: '2024-05-20', price: 35000, quantity: 50, totalCost: 1750000, targetRatio: 20, targetPrice: 40000, actualPrice: 0, realizedProfit: 0, note: 'IRP 세액공제용', stockCode: '069500', currentPrice: 34500, rowIndex: 4 }
]; 
let mockInvestmentGoals: InvestmentGoal[] = [
    { category: 'ETF', targetRatio: 60 },
    { category: '주식', targetRatio: 20 },
    { category: '채권', targetRatio: 10 },
    { category: '금', targetRatio: 10 }
];
let mockChecklist: ChecklistItem[] = [
    { id: 'C1', title: '자동 이체 설정', content: '공과금 및 보험료 자동이체 확인', date: '2024-05-01', status: '완료', rowIndex: 2 }
];
let mockTodoGroups: TodoGroup[] = [
    { id: 'G1', title: '마트 장보기', memo: '주말 저녁 준비', date: '2024-05-20', color: '#3B82F6', rowIndex: 2 },
    { id: 'G2', title: '이사 준비', memo: '짐 싸기 및 청소', date: '2024-05-15', color: '#10B981', rowIndex: 3 }
];
let mockTodoItems: TodoItem[] = [
    { id: 'I1', groupId: 'G1', name: '삼겹살 600g', status: '대기', date: '2024-05-20', rowIndex: 2 },
    { id: 'I2', groupId: 'G1', name: '쌈채소', status: '완료', date: '2024-05-20', rowIndex: 3 },
    { id: 'I3', groupId: 'G2', name: '박스 구하기', status: '완료', date: '2024-05-15', rowIndex: 4 }
];
let mockAccounts = ['🐴토스', '🐴카카오', '🐭카드', '🐭현금'];
let mockSubcategories = ['식비', '교통', '월급', '생활비', '부업', '투자금'];
let mockIncomeSources = ['회사', '중고거래', '기타'];
let mockSubscriptionTags = ['📺 OTT', '🛍️ 쇼핑', '🎵 음악', '🏠 생활'];
let mockManagedAccounts = ['🐴토스', '🐴카카오', '🐭카드'];
let mockKeywords: FixedKeyword[] = [];
let mockHiddenCategories: string[] = [];
let mockHiddenAccounts: string[] = [];
let mockBaseDay = 1;
let mockFourthTab: string = Tab.SUBSCRIPTION;

const generateUniqueId = () => `ID_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
export const setTestMode = (enabled: boolean) => { isTestMode = enabled; };

const normalizeDate = (dateStr: any): string => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parts = str.match(/\d+/g);
    if (parts && parts.length >= 3) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return '';
};

const convertToDirectLink = (url: string): string => {
    if (!url) return '';
    if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
};

const fetchUserProfile = async (): Promise<UserProfile | null> => {
    try {
        const response = await window.gapi.client.request({ 'path': 'https://www.googleapis.com/oauth2/v3/userinfo' });
        return response.result;
    } catch (error) {
        return null;
    }
};

export const initGoogleClient = (callback: (isSignedIn: boolean, userEmail: string | null) => void) => {
    if (!GOOGLE_CLIENT_ID) {
        console.error("GOOGLE_CLIENT_ID is missing. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.");
        callback(false, null);
        return;
    }

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.onerror = () => {
        console.error("Failed to load GAPI script");
        callback(false, null);
    };
    document.body.appendChild(gapiScript);

    const attemptSilentSignIn = () => {
        if (isGapiInitialized && isGisInitialized) {
            if (localStorage.getItem('userSignedOut') === 'true') {
                callback(false, null);
                return;
            }
            try {
                tokenClient.requestAccessToken({ prompt: 'none' });
            } catch (err) {
                console.error("Silent sign-in failed", err);
                callback(false, null);
            }
        }
    }

    gapiScript.onload = () => {
        window.gapi.load('client', async () => {
            try {
                await window.gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });
                isGapiInitialized = true;
                attemptSilentSignIn();
            } catch (err) {
                console.error("GAPI initialization failed", err);
                callback(false, null);
            }
        });
    };

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.onerror = () => {
        console.error("Failed to load GIS script");
        callback(false, null);
    };
    document.body.appendChild(gisScript);

    gisScript.onload = () => {
        try {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                error_callback: (err: any) => {
                    console.error("GIS Token Client error", err);
                    callback(false, null);
                },
                callback: async (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        localStorage.removeItem('userSignedOut');
                        window.gapi.client.setToken({ access_token: tokenResponse.access_token });
                        const profile = await fetchUserProfile();
                        if (profile && ALLOWED_EMAILS.includes(profile.email)) {
                            callback(true, profile.email);
                        } else if(profile) {
                            alert(`⛔️ 접근 권한이 없습니다 (${profile.email})`);
                            handleLogout();
                            callback(false, null);
                        }
                    } else {
                        console.warn("No access token in response", tokenResponse);
                        callback(false, null);
                    }
                },
            });
            isGisInitialized = true;
            attemptSilentSignIn();
        } catch (err) {
            console.error("GIS initialization failed", err);
            callback(false, null);
        }
    };
};

export const handleLogin = () => {
    if (isTestMode) return;
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'select_account' });
};

export const handleLogout = () => {
    if (isTestMode) { isTestMode = false; return; }
    window.gapi.client.setToken(null);
    localStorage.setItem('userSignedOut', 'true');
};

export const uploadImageToDrive = async (base64String: string): Promise<string> => {
    if (!base64String || isTestMode) return '';
    const boundary = '-------314159265358979323846';
    const contentType = base64String.substring(5, base64String.indexOf(';'));
    const base64Data = base64String.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    const metadata = { name: `receipt_${Date.now()}.jpg`, mimeType: contentType, parents: [currentFolderId] };
    const multipartRequestBody = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Data}\r\n--${boundary}--`;

    const response = await window.gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: multipartRequestBody
    });
    const fileId = response.result.id;
    await window.gapi.client.drive.permissions.create({ fileId, resource: { role: 'reader', type: 'anyone' } });
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
};

// --- Sheet Management Logic ---

// Avoid repeated sheet "ensure" bursts (can trigger 429).
const ensuredSheetIds = new Set<string>();
const ensuringBySheetId: Record<string, Promise<void> | undefined> = {};

const ensureAllSheetsExist = async (forcedId?: string) => {
    if (isTestMode) return;
    const targetId = forcedId || currentSpreadsheetId;
    if (ensuredSheetIds.has(targetId)) return;
    if (ensuringBySheetId[targetId]) return ensuringBySheetId[targetId]!;

    ensuringBySheetId[targetId] = (async () => {
    try {
        const metadata = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: targetId });
        const existingTitles = new Set(metadata.result.sheets.map((s: any) => s.properties.title));
        
        const requests: any[] = [];
        const requiredSheets: Record<string, string[]> = {
            [SHEET_NAMES.RECORDS]: ['입력시간', '분류', '상세분류', '금액', '결제수단', '내용', '날짜', '정산상태', '비고1', '비고2', '이미지', '고유ID', '이동ID', '정산한통장', '정산받은통장', '수입처'], 
            [SHEET_NAMES.SUBSCRIPTIONS]: ['ID', '구독명', '금액', '갱신주기', '결제수단', '시작일', '태그', '메모', '상태'],
            [SHEET_NAMES.MANAGED_ACCOUNTS]: ['계좌명'],
            [SHEET_NAMES.BUDGET_VISIBILITY]: ['Type', 'Value'],
            [SHEET_NAMES.FIXED_KEYWORDS]: ['Keyword', 'Category', 'Amount'],
            [SHEET_NAMES.INVESTMENTS]: ['ID', '종목명', '구매처', '카테고리', '계좌유형', '매수일', '주당단가', '매수수량', '총구매액', '목표비율(%)', '목표매도가', '실제매도가', '수익실현금', '비고', '현재가', '종목코드'],
            [SHEET_NAMES.INVESTMENT_GOALS]: ['Category', 'TargetRatio'],
            [SHEET_NAMES.INVESTMENT_ACCOUNT_TYPES]: ['계좌유형'],
            [SHEET_NAMES.INVESTMENT_BROKERS]: ['구매처'],
            [SHEET_NAMES.INVESTMENT_STOCK_CODES]: ['종목코드'],
            [SHEET_NAMES.INVESTMENT_ACCOUNTS]: ['ID', '계좌유형', '은행명', '계좌명', '계좌번호', '개설일', '예수금', '해지일', '설명'],
            [SHEET_NAMES.INVESTMENT_ANNUAL_RETURNS]: ['연도', '수익률(%)'],
            [SHEET_NAMES.ACCOUNTS]: ['계좌명'],
            [SHEET_NAMES.SUBCATEGORIES]: ['카테고리명'],
            [SHEET_NAMES.INCOME_SOURCES]: ['수입처명'], 
            [SHEET_NAMES.SUBSCRIPTION_TAGS]: ['태그명'],
            [SHEET_NAMES.CHECKLIST]: ['ID', '제목', '내용', '날짜', '상태'],
            [SHEET_NAMES.TODO_GROUPS]: ['ID', '주제', '메모', '날짜', '색상'],
            [SHEET_NAMES.TODO_ITEMS]: ['ID', '그룹ID', '항목명', '상태', '날짜'],
            [SHEET_NAMES.ASSET_PLANS]: ['ID', '제목', '내용', '날짜', '태그'],
            [SHEET_NAMES.SETTINGS]: ['SettingName', 'SettingValue']
        };

        const missingTitles: string[] = [];
        Object.keys(requiredSheets).forEach(title => {
            if (!existingTitles.has(title)) {
                requests.push({ addSheet: { properties: { title } } });
                missingTitles.push(title);
            }
        });

        if (requests.length > 0) {
            await window.gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: targetId,
                resource: { requests }
            });
        }

        // Only initialize headers for newly created sheets.
        // (Checking headers for every sheet via many API calls can trigger 429.)
        for (const title of missingTitles) {
            const headers = requiredSheets[title];
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: targetId,
                range: `'${title}'!A1`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [headers] }
            });
        }

        ensuredSheetIds.add(targetId);
    } catch (e) {
        console.error("Failed to ensure sheets exist", e);
        throw e;
    } finally {
        ensuringBySheetId[targetId] = undefined;
    }
    })();

    return ensuringBySheetId[targetId]!;
};

export const fetchInvestmentAnnualReturns = async (): Promise<Record<number, number | null>> => {
    if (isTestMode) return {};
    try {
        await ensureAllSheetsExist();
        const res = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: currentSpreadsheetId,
            range: `'${SHEET_NAMES.INVESTMENT_ANNUAL_RETURNS}'!A2:B`
        });
        const rows = res.result.values || [];
        const map: Record<number, number | null> = {};
        rows.forEach((r: any[]) => {
            const y = parseInt(String(r[0] || '').trim(), 10);
            const vRaw = String(r[1] ?? '').trim();
            if (!Number.isFinite(y)) return;
            if (vRaw === '') { map[y] = null; return; }
            const v = parseFloat(vRaw.replace(/,/g, ''));
            map[y] = Number.isFinite(v) ? v : null;
        });
        return map;
    } catch (e) {
        return {};
    }
};

export const saveInvestmentAnnualReturns = async (returnsByYear: Record<number, number | null>) => {
    if (isTestMode) return;
    await ensureAllSheetsExist();
    const years = Object.keys(returnsByYear)
        .map((k) => parseInt(k, 10))
        .filter((y) => Number.isFinite(y))
        .sort((a, b) => a - b);
    const values = years
        .map((y) => {
            const v = returnsByYear[y];
            if (typeof v !== 'number' || Number.isNaN(v)) return null;
            return [y, v];
        })
        .filter(Boolean) as any[];

    // Keep sheet tidy: overwrite A2:B with provided rows.
    await window.gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: currentSpreadsheetId,
        range: `'${SHEET_NAMES.INVESTMENT_ANNUAL_RETURNS}'!A2:B`
    });

    if (values.length === 0) return;
    await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: currentSpreadsheetId,
        range: `'${SHEET_NAMES.INVESTMENT_ANNUAL_RETURNS}'!A2`,
        valueInputOption: 'USER_ENTERED',
        resource: { values }
    });
};

// --- Salary Template Service (CRITICAL: RESTORED) ---

export const fetchSalaryTemplate = async (type: 'mouse' | 'horse' | 'gulbi'): Promise<SalaryTemplateItem[]> => {
    if (isTestMode) return [];
    
    // Mouse/Integrated: A~G, Horse: J~P 분기 로직 원본 복구
    let range = (type === 'mouse' || type === 'gulbi') ? `'${SHEET_NAMES.TEMPLATE}'!A2:G30` : `'${SHEET_NAMES.TEMPLATE}'!J2:P30`;
    
    try {
        const res = await window.gapi.client.sheets.spreadsheets.values.get({ 
            spreadsheetId: currentSpreadsheetId, 
            range 
        });
        const rows = res.result.values || [];
        return rows.map((r: any[], idx: number) => ({
            category: r[0] || '',
            subcategory: r[1] || '',
            cost: parseFloat(String(r[2] || '0').replace(/,/g, '')) || 0,
            account: r[3] || '',
            note: r[4] || '',
            settlement: r[6] || '🟢 완료',
            rowIndex: 2 + idx
        })).filter(item => item.category || item.subcategory);
    } catch (e) { 
        return []; 
    }
};

export const saveSalaryTemplate = async (type: 'mouse' | 'horse' | 'gulbi', items: SalaryTemplateItem[]) => {
    if (isTestMode) return;
    
    let range = (type === 'mouse' || type === 'gulbi') ? `'${SHEET_NAMES.TEMPLATE}'!A2:G30` : `'${SHEET_NAMES.TEMPLATE}'!J2:P30`;
    
    const values = Array.from({ length: 29 }, (_, i) => {
        const item = items[i];
        if (!item) return ["", "", "", "", "", "", ""];
        return [
            item.category, 
            item.subcategory, 
            item.cost, 
            item.account, 
            item.note, 
            "", 
            item.settlement
        ];
    });
    
    try {
        await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: currentSpreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource: { values }
        });
    } catch (e) { 
        throw new Error("템플릿 저장 실패"); 
    }
};

export const executeSalaryBatch = async (type: string, appMode?: string) => {
    if (isTestMode) return `[시뮬레이션] ${type === 'mouse' ? '🐭' : '🐴'} 입력 완료`;
    
    let range = (type === 'mouse') ? `'${SHEET_NAMES.TEMPLATE}'!A2:G30` : (type === 'horse' ? `'${SHEET_NAMES.TEMPLATE}'!J2:P30` : `'${SHEET_NAMES.TEMPLATE}'!A2:G30`);
    
    try {
        const res = await window.gapi.client.sheets.spreadsheets.values.get({ 
            spreadsheetId: currentSpreadsheetId, 
            range 
        });
        const rows = res.result.values;
        if(!rows) throw new Error("데이터 없음");
        
        const now = new Date();
        const values = rows
            .filter((r:any[]) => r[0] && r[1])
            .map((row:any[]) => [
                now.toISOString(), 
                row[0], 
                row[1], 
                parseFloat(String(row[2] || '0').replace(/,/g,'')), 
                row[3], 
                row[4], 
                now.toISOString().split('T')[0], 
                row[6] || '🟢 완료', 
                "", "", "", 
                generateUniqueId(), 
                "", "", "", ""
            ]);
            
        if (values.length === 0) throw new Error("입력할 데이터가 없습니다.");
        
        await ensureAllSheetsExist();
        await window.gapi.client.sheets.spreadsheets.values.append({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.RECORDS}'!A1`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values } 
        });
        return `${values.length}건 입력 완료`;
    } catch (e: any) {
        throw e;
    }
};

// --- Todo & Assets (FORMATTED) ---

export const fetchTodoGroups = async (): Promise<TodoGroup[]> => {
    if (isTestMode) return [...mockTodoGroups].reverse();
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            range: `'${SHEET_NAMES.TODO_GROUPS}'!A2:E`
        });
        const rows = response.result.values || [];
        return rows.map((row: any[], index: number) => ({
            id: row[0] || '',
            title: row[1] || '',
            memo: row[2] || '',
            date: row[3] || '',
            color: row[4] || '#3B82F6',
            rowIndex: index + 2
        })).reverse();
    } catch (e) { 
        await ensureAllSheetsExist(DEFAULT_SPREADSHEET_ID); 
        return []; 
    }
};

export const fetchTodoItems = async (groupId?: string): Promise<TodoItem[]> => {
    if (isTestMode) {
        let items = [...mockTodoItems];
        if (groupId) items = items.filter(i => i.groupId === groupId);
        return items.reverse();
    }
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            range: `'${SHEET_NAMES.TODO_ITEMS}'!A2:E`
        });
        const rows = response.result.values || [];
        const items = rows.map((row: any[], index: number) => ({
            id: row[0] || '',
            groupId: row[1] || '',
            name: row[2] || '',
            status: row[3] || '대기',
            date: row[4] || '',
            rowIndex: index + 2
        }));
        return groupId ? items.filter(i => i.groupId === groupId).reverse() : items.reverse();
    } catch (e) { 
        return []; 
    }
};

export const addTodoGroup = async (group: Omit<TodoGroup, 'rowIndex'>) => {
    if (isTestMode) { 
        mockTodoGroups.push({ ...group, rowIndex: mockTodoGroups.length + 2 }); 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            range: `'${SHEET_NAMES.TODO_GROUPS}'!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[group.id, group.title, group.memo, group.date, group.color]] }
        });
    } catch (e) {
        throw e;
    }
};

export const updateTodoGroup = async (rowIndex: number, group: TodoGroup) => {
    if (isTestMode) {
        const idx = mockTodoGroups.findIndex(g => g.rowIndex === rowIndex);
        if (idx !== -1) mockTodoGroups[idx] = group;
        return;
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            range: `'${SHEET_NAMES.TODO_GROUPS}'!A${rowIndex}:E${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[group.id, group.title, group.memo, group.date, group.color]] }
        });
    } catch (e) {
        throw e;
    }
};

export const deleteTodoGroup = async (rowIndex: number, groupId: string) => {
    if (isTestMode) {
        mockTodoGroups = mockTodoGroups.filter(g => g.rowIndex !== rowIndex);
        mockTodoItems = mockTodoItems.filter(i => i.groupId !== groupId);
        return;
    }
    try {
        const metadata = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: DEFAULT_SPREADSHEET_ID });
        const groupSheetId = metadata.result.sheets.find((s:any) => s.properties.title === SHEET_NAMES.TODO_GROUPS).properties.sheetId;
        
        await window.gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            resource: { 
                requests: [{ 
                    deleteDimension: { 
                        range: { 
                            sheetId: groupSheetId, 
                            dimension: "ROWS", 
                            startIndex: rowIndex - 1, 
                            endIndex: rowIndex 
                        } 
                    } 
                }] 
            }
        });
        
        const allItems = await fetchTodoItems();
        const itemsToDelete = allItems
            .filter(i => i.groupId === groupId)
            .sort((a,b) => (b.rowIndex || 0) - (a.rowIndex || 0));
            
        const itemSheetId = metadata.result.sheets.find((s:any) => s.properties.title === SHEET_NAMES.TODO_ITEMS).properties.sheetId;
        
        if (itemsToDelete.length > 0) {
            const requests = itemsToDelete.map(i => ({ 
                deleteDimension: { 
                    range: { 
                        sheetId: itemSheetId, 
                        dimension: "ROWS", 
                        startIndex: (i.rowIndex || 1) - 1, 
                        endIndex: i.rowIndex 
                    } 
                } 
            }));
            await window.gapi.client.sheets.spreadsheets.batchUpdate({ 
                spreadsheetId: DEFAULT_SPREADSHEET_ID, 
                resource: { requests } 
            });
        }
    } catch (e) {
        throw e;
    }
};

export const addTodoItem = async (item: Omit<TodoItem, 'rowIndex'>) => {
    if (isTestMode) { 
        mockTodoItems.push({ ...item, rowIndex: mockTodoItems.length + 2 }); 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            range: `'${SHEET_NAMES.TODO_ITEMS}'!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[item.id, item.groupId, item.name, item.status, item.date]] }
        });
    } catch (e) {
        throw e;
    }
};

export const updateTodoItem = async (rowIndex: number, item: TodoItem) => {
    if (isTestMode) {
        const idx = mockTodoItems.findIndex(i => i.rowIndex === rowIndex);
        if (idx !== -1) mockTodoItems[idx] = item;
        return;
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            range: `'${SHEET_NAMES.TODO_ITEMS}'!A${rowIndex}:E${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[item.id, item.groupId, item.name, item.status, item.date]] }
        });
    } catch (e) {
        throw e;
    }
};

export const deleteTodoItem = async (rowIndex: number) => {
    if (isTestMode) { 
        mockTodoItems = mockTodoItems.filter(i => i.rowIndex !== rowIndex); 
        return; 
    }
    try {
        const metadata = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: DEFAULT_SPREADSHEET_ID });
        const sheetId = metadata.result.sheets.find((s:any) => s.properties.title === SHEET_NAMES.TODO_ITEMS).properties.sheetId;
        await window.gapi.client.sheets.spreadsheets.batchUpdate({ 
            spreadsheetId: DEFAULT_SPREADSHEET_ID, 
            resource: { 
                requests: [{ 
                    deleteDimension: { 
                        range: { 
                            sheetId, 
                            dimension: "ROWS", 
                            startIndex: rowIndex - 1, 
                            endIndex: rowIndex 
                        } 
                    } 
                }] 
            } 
        });
    } catch (e) {
        throw e;
    }
};

export const fetchAssetPlans = async (): Promise<AssetPlan[]> => {
    if (isTestMode) return [...mockAssetPlans].reverse();
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            range: `'${SHEET_NAMES.ASSET_PLANS}'!A2:E`
        });
        const rows = response.result.values || [];
        return rows.map((row: any[], index: number) => ({ 
            id: row[0] || '', 
            title: row[1] || '', 
            content: row[2] || '', 
            date: row[3] || '', 
            tag: row[4] || '', 
            rowIndex: index + 2 
        })).reverse();
    } catch (e) { 
        await ensureAllSheetsExist(DEFAULT_SPREADSHEET_ID); 
        return []; 
    }
};

export const addAssetPlan = async (item: Omit<AssetPlan, 'rowIndex'>) => {
    if (isTestMode) { 
        mockAssetPlans.push({ ...item, rowIndex: mockAssetPlans.length + 2 }); 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            range: `'${SHEET_NAMES.ASSET_PLANS}'!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[item.id, item.title, item.content, item.date, item.tag]] }
        });
    } catch (e) {
        throw e;
    }
};

export const updateAssetPlan = async (rowIndex: number, item: AssetPlan) => {
    if (isTestMode) {
        const idx = mockAssetPlans.findIndex(i => i.rowIndex === rowIndex);
        if (idx !== -1) mockAssetPlans[idx] = item;
        return;
    }
    try {
        const row = [item.id, item.title, item.content, item.date, item.tag];
        await window.gapi.client.sheets.spreadsheets.values.update({ 
            spreadsheetId: DEFAULT_SPREADSHEET_ID, 
            range: `'${SHEET_NAMES.ASSET_PLANS}'!A${rowIndex}:E${rowIndex}`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values: [row] } 
        });
    } catch (e) {
        throw e;
    }
};

export const deleteAssetPlan = async (rowIndex: number) => {
    if (isTestMode) { 
        mockAssetPlans = mockAssetPlans.filter(i => i.rowIndex !== rowIndex); 
        return; 
    }
    try {
        const metadata = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: DEFAULT_SPREADSHEET_ID });
        const sheetId = metadata.result.sheets.find((s:any) => s.properties.title === SHEET_NAMES.ASSET_PLANS).properties.sheetId;
        await window.gapi.client.sheets.spreadsheets.batchUpdate({ 
            spreadsheetId: DEFAULT_SPREADSHEET_ID, 
            resource: { 
                requests: [{ 
                    deleteDimension: { 
                        range: { 
                            sheetId, 
                            dimension: "ROWS", 
                            startIndex: rowIndex - 1, 
                            endIndex: rowIndex 
                        } 
                    } 
                }] 
            } 
        });
    } catch (e) {
        throw e;
    }
};

// --- Settings & Meta (FORMATTED) ---

export const updateBaseDay = async (day: number) => {
    if (isTestMode) { 
        mockBaseDay = day; 
        return; 
    }
    try {
        await ensureAllSheetsExist();
        const res = await window.gapi.client.sheets.spreadsheets.values.get({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.SETTINGS}'!A2:B` 
        });
        const rows = res.result.values || [];
        const index = rows.findIndex((r: any[]) => r[0] === 'BaseDay');
        
        if (index !== -1) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.SETTINGS}'!B${index + 2}`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: [[day]] } 
            }); 
        } else { 
            await window.gapi.client.sheets.spreadsheets.values.append({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.SETTINGS}'!A1`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: [['BaseDay', day]] } 
            }); 
        }
    } catch (e) { 
        throw new Error("기준일 저장 실패"); 
    }
};

export const updateFourthTabSetting = async (tab: Tab) => {
    if (isTestMode) { 
        mockFourthTab = tab; 
        return; 
    }
    try {
        await ensureAllSheetsExist();
        const res = await window.gapi.client.sheets.spreadsheets.values.get({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.SETTINGS}'!A2:B` 
        });
        const rows = res.result.values || [];
        const index = rows.findIndex((r: any[]) => r[0] === 'FourthTab');
        
        if (index !== -1) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.SETTINGS}'!B${index + 2}`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: [[tab]] } 
            }); 
        } else { 
            await window.gapi.client.sheets.spreadsheets.values.append({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.SETTINGS}'!A1`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: [['FourthTab', tab]] } 
            }); 
        }
    } catch (e) { 
        console.error("Failed to update menu setting", e); 
    }
};

export const fetchChecklist = async (): Promise<ChecklistItem[]> => {
    if (isTestMode) return [...mockChecklist].reverse();
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({ 
            spreadsheetId: DEFAULT_SPREADSHEET_ID, 
            range: `'${SHEET_NAMES.CHECKLIST}'!A2:E` 
        });
        const rows = response.result.values || [];
        return rows.map((row: any[], index: number) => ({ 
            id: row[0] || '', 
            title: row[1] || '', 
            content: row[2] || '', 
            date: row[3] || '', 
            status: row[4] || '대기', 
            rowIndex: index + 2 
        })).reverse();
    } catch (e) { 
        await ensureAllSheetsExist(DEFAULT_SPREADSHEET_ID); 
        return []; 
    }
};

export const addChecklistItem = async (item: Omit<ChecklistItem, 'rowIndex'>) => {
    if (isTestMode) { 
        mockChecklist.push({ ...item, rowIndex: mockChecklist.length + 2 }); 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.append({ 
            spreadsheetId: DEFAULT_SPREADSHEET_ID, 
            range: `'${SHEET_NAMES.CHECKLIST}'!A1`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values: [[item.id, item.title, item.content, item.date, item.status]] } 
        });
    } catch (e) {
        throw e;
    }
};

export const updateChecklistItem = async (rowIndex: number, item: ChecklistItem) => {
    if (isTestMode) { 
        const idx = mockChecklist.findIndex(i => i.rowIndex === rowIndex); 
        if (idx !== -1) mockChecklist[idx] = item; 
        return; 
    }
    try {
        const row = [item.id, item.title, item.content, item.date, item.status];
        await window.gapi.client.sheets.spreadsheets.values.update({ 
            spreadsheetId: DEFAULT_SPREADSHEET_ID, 
            range: `'${SHEET_NAMES.CHECKLIST}'!A${rowIndex}:E${rowIndex}`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values: [row] } 
        });
    } catch (e) {
        throw e;
    }
};

export const deleteChecklistItem = async (rowIndex: number) => {
    if (isTestMode) { 
        mockChecklist = mockChecklist.filter(i => i.rowIndex !== rowIndex); 
        return; 
    }
    try {
        const metadata = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: DEFAULT_SPREADSHEET_ID });
        const sheetId = metadata.result.sheets.find((s:any) => s.properties.title === SHEET_NAMES.CHECKLIST).properties.sheetId;
        await window.gapi.client.sheets.spreadsheets.batchUpdate({ 
            spreadsheetId: DEFAULT_SPREADSHEET_ID, 
            resource: { 
                requests: [{ 
                    deleteDimension: { 
                        range: { 
                            sheetId, 
                            dimension: "ROWS", 
                            startIndex: rowIndex - 1, 
                            endIndex: rowIndex 
                        } 
                    } 
                }] 
            } 
        });
    } catch (e) {
        throw e;
    }
};

// --- Subscriptions & Investments (FORMATTED) ---

export const addSubscription = async (sub: Omit<Subscription, 'rowIndex'>) => {
    if (isTestMode) { 
        mockSubscriptions.push({ ...sub, rowIndex: mockSubscriptions.length + 2 }); 
        return; 
    }
    try {
        await ensureAllSheetsExist();
        await window.gapi.client.sheets.spreadsheets.values.append({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.SUBSCRIPTIONS}'!A1`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values: [[sub.id, sub.name, sub.cost, sub.cycle, sub.paymentMethod, sub.startDate, sub.tag, sub.memo, sub.status]] } 
        });
    } catch (e) {
        throw e;
    }
};

export const updateSubscription = async (rowIndex: number, sub: Subscription) => {
    if (isTestMode) { 
        const idx = mockSubscriptions.findIndex(s => s.rowIndex === rowIndex); 
        if (idx > -1) mockSubscriptions[idx] = sub; 
        return; 
    }
    try {
        const row = [sub.id, sub.name, sub.cost, sub.cycle, sub.paymentMethod, sub.startDate, sub.tag, sub.memo, sub.status];
        await window.gapi.client.sheets.spreadsheets.values.update({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.SUBSCRIPTIONS}'!A${rowIndex}:I${rowIndex}`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values: [row] } 
        });
    } catch (e) {
        throw e;
    }
};

export const deleteSubscription = async (rowIndex: number) => {
    if (isTestMode) { 
        mockSubscriptions = mockSubscriptions.filter(s => s.rowIndex !== rowIndex); 
        return; 
    }
    try {
        const metadata = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: currentSpreadsheetId });
        const sheetId = metadata.result.sheets.find((s:any) => s.properties.title === SHEET_NAMES.SUBSCRIPTIONS).properties.sheetId;
        await window.gapi.client.sheets.spreadsheets.batchUpdate({ 
            spreadsheetId: currentSpreadsheetId, 
            resource: { 
                requests: [{ 
                    deleteDimension: { 
                        range: { 
                            sheetId, 
                            dimension: "ROWS", 
                            startIndex: rowIndex - 1, 
                            endIndex: rowIndex 
                        } 
                    } 
                }] 
            } 
        });
    } catch (e) {
        throw e;
    }
};

export const addInvestment = async (inv: Omit<InvestmentItem, 'rowIndex'>) => {
    if (isTestMode) { 
        mockInvestments.push({ ...inv, rowIndex: mockInvestments.length + 2 }); 
        return; 
    }
    try {
        await ensureAllSheetsExist();
        
        let noteWithAccount = inv.note || '';
        // Persist linking info inside note to avoid sheet schema changes.
        // Format: [ACC:<accountId>] [ISA|IRP|연금저축] <note>
        if (inv.accountId) {
            noteWithAccount = `[ACC:${inv.accountId}] ${noteWithAccount}`.trim();
        }
        if (inv.accountType && inv.accountType !== '일반') {
            noteWithAccount = `[${inv.accountType}] ${noteWithAccount}`.trim();
        }

        const stockCodeCell = `INDIRECT("O"&ROW())`;
        const naverPriceFormula = `=IF(${stockCodeCell}="", "", IFERROR(VALUE(SUBSTITUTE(IMPORTXML("https://finance.naver.com/item/main.naver?code=" & TEXT(${stockCodeCell}, "000000"), "//p[@class='no_today']/em/span[1]"), ",", "")), 0))`;
        const currentPriceFormula = inv.category?.includes('$')
            ? `=GOOGLEFINANCE("CURRENCY:USDKRW")`
            : naverPriceFormula;

        const row = [
            inv.id, inv.name, inv.broker, inv.category, inv.date, 
            inv.price, inv.quantity, inv.totalCost, inv.targetRatio, 
            inv.targetPrice, inv.actualPrice, inv.realizedProfit, noteWithAccount, 
            currentPriceFormula, inv.stockCode || "", inv.sellDate || "", inv.soldQuantity || "", inv.soldPrice || ""
        ];
        await window.gapi.client.sheets.spreadsheets.values.append({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.INVESTMENTS}'!A1`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values: [row] } 
        });
    } catch (e) {
        throw e;
    }
};

export const updateInvestment = async (rowIndex: number, inv: InvestmentItem) => {
    if (isTestMode) return;
    try {
        const stockCodeCell = `INDIRECT("O"&ROW())`;
        const naverPriceFormula = `=IF(${stockCodeCell}="", "", IFERROR(VALUE(SUBSTITUTE(IMPORTXML("https://finance.naver.com/item/main.naver?code=" & TEXT(${stockCodeCell}, "000000"), "//p[@class='no_today']/em/span[1]"), ",", "")), 0))`;
        const formula = inv.category?.includes('$')
            ? `=GOOGLEFINANCE("CURRENCY:USDKRW")`
            : naverPriceFormula;
        
        let noteWithAccount = inv.note || '';
        if (inv.accountId) {
            noteWithAccount = `[ACC:${inv.accountId}] ${noteWithAccount}`.trim();
        }
        if (inv.accountType && inv.accountType !== '일반') {
            noteWithAccount = `[${inv.accountType}] ${noteWithAccount}`.trim();
        }

        const row = [
            inv.id, inv.name, inv.broker, inv.category, inv.date, 
            inv.price, inv.quantity, inv.totalCost, inv.targetRatio, 
            inv.targetPrice, inv.actualPrice, inv.realizedProfit, noteWithAccount, 
            formula, inv.stockCode || "", inv.sellDate || "", inv.soldQuantity || "", inv.soldPrice || ""
        ];
        await window.gapi.client.sheets.spreadsheets.values.update({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.INVESTMENTS}'!A${rowIndex}:R${rowIndex}`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values: [row] } 
        });
    } catch (e) {
        throw e;
    }
};

export const deleteInvestment = async (rowIndex: number) => {
    if (isTestMode) return;
    try {
        const metadata = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: currentSpreadsheetId });
        const sheetId = metadata.result.sheets.find((s:any) => s.properties.title === SHEET_NAMES.INVESTMENTS).properties.sheetId;
        await window.gapi.client.sheets.spreadsheets.batchUpdate({ 
            spreadsheetId: currentSpreadsheetId, 
            resource: { 
                requests: [{ 
                    deleteDimension: { 
                        range: { 
                            sheetId, 
                            dimension: "ROWS", 
                            startIndex: rowIndex - 1, 
                            endIndex: rowIndex 
                        } 
                    } 
                }] 
            } 
        });
    } catch (e) {
        throw e;
    }
};

export const updateInvestmentGoals = async (goals: InvestmentGoal[]) => {
    if (isTestMode) { 
        mockInvestmentGoals = [...goals]; 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.INVESTMENT_GOALS}'!A2:B` 
        });
        if (goals.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.INVESTMENT_GOALS}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: goals.map(g => [g.category, g.targetRatio]) } 
            }); 
        }
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("투자 목표 설정 저장 실패"); 
    }
};

// --- Lists Update (FORMATTED) ---

const updateReferences = async (sheetName: string, columnIndex: number, renameMap: Record<string, string>) => {
    if (Object.keys(renameMap).length === 0) return;
    try {
        const colLetter = String.fromCharCode(65 + columnIndex); 
        const range = `'${sheetName}'!${colLetter}2:${colLetter}`;
        const res = await window.gapi.client.sheets.spreadsheets.values.get({ 
            spreadsheetId: currentSpreadsheetId, 
            range 
        });
        const rows = res.result.values || [];
        let hasChanges = false;
        const updatedRows = rows.map((row: any[]) => {
            const val = row[0] || '';
            if (renameMap[val]) { 
                hasChanges = true; 
                return [renameMap[val]]; 
            }
            return [val];
        });
        if (hasChanges) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${sheetName}'!${colLetter}2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: updatedRows } 
            }); 
        }
    } catch (e) { 
        console.error(`Failed to update references in ${sheetName}`, e); 
    }
};

export const updateSubcategories = async (list: string[], renameMap: Record<string, string> = {}) => {
    if (isTestMode) { 
        mockSubcategories = [...list]; 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.SUBCATEGORIES}'!A2:A500` 
        });
        if (list.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.SUBCATEGORIES}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: list.map(item => [item]) } 
            }); 
        }
        await updateReferences(SHEET_NAMES.RECORDS, 2, renameMap);
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("상세분류 업데이트 실패"); 
    }
};

export const updateAccounts = async (list: string[], renameMap: Record<string, string> = {}) => {
    if (isTestMode) { 
        mockAccounts = [...list]; 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.ACCOUNTS}'!A2:A500` 
        });
        if (list.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.ACCOUNTS}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: list.map(item => [item]) } 
            }); 
        }
        await updateReferences(SHEET_NAMES.RECORDS, 4, renameMap);
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("결제수단 업데이트 실패"); 
    }
};

export const updateIncomeSources = async (list: string[], renameMap: Record<string, string> = {}) => {
    if (isTestMode) { 
        mockIncomeSources = [...list]; 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.INCOME_SOURCES}'!A2:A500` 
        });
        if (list.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.INCOME_SOURCES}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: list.map(item => [item]) } 
            }); 
        }
        await updateReferences(SHEET_NAMES.RECORDS, 15, renameMap); 
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("수입처 업데이트 실패"); 
    }
};

export const updateSubscriptionTags = async (list: string[], renameMap: Record<string, string> = {}) => {
    if (isTestMode) { 
        mockSubscriptionTags = [...list]; 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.SUBSCRIPTION_TAGS}'!A2:A500` 
        });
        if (list.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.SUBSCRIPTION_TAGS}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: list.map(item => [item]) } 
            }); 
        }
        await updateReferences(SHEET_NAMES.SUBSCRIPTIONS, 6, renameMap);
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("구독태그 업데이트 실패"); 
    }
};

export const updateInvestmentCategories = async (list: string[], renameMap: Record<string, string> = {}) => {
    // Assuming there is a sheet named 'Categories' or similar to manage categories
    // This is a placeholder implementation that needs to be adapted to your actual sheet structure
    // You might need to use a similar approach as updateInvestmentAccountTypes
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: currentSpreadsheetId,
            range: 'Categories!A2:A', // Adjust range as needed
            valueInputOption: 'RAW',
            resource: {
                values: list.map(item => [item])
            }
        });
        return response;
    } catch (error) {
        console.error('Error updating categories:', error);
        throw error;
    }
};

export const updateInvestmentAccountTypes = async (list: string[], renameMap: Record<string, string> = {}) => {
    if (isTestMode) return;
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.INVESTMENT_ACCOUNT_TYPES}'!A2:A500` 
        });
        if (list.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.INVESTMENT_ACCOUNT_TYPES}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: list.map(item => [item]) } 
            }); 
        }
        await updateReferences(SHEET_NAMES.INVESTMENTS, 4, renameMap);
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("투자 계좌 유형 업데이트 실패"); 
    }
};

export const updateInvestmentBrokers = async (list: string[], renameMap: Record<string, string> = {}) => {
    if (isTestMode) return;
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.INVESTMENT_BROKERS}'!A2:A500` 
        });
        if (list.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.INVESTMENT_BROKERS}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: list.map(item => [item]) } 
            }); 
        }
        await updateReferences(SHEET_NAMES.INVESTMENTS, 2, renameMap);
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("투자 구매처 업데이트 실패"); 
    }
};

export const updateInvestmentStockCodes = async (list: string[], renameMap: Record<string, string> = {}) => {
    if (isTestMode) return;
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.INVESTMENT_STOCK_CODES}'!A2:A500` 
        });
        if (list.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.INVESTMENT_STOCK_CODES}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: list.map(item => [item]) } 
            }); 
        }
        await updateReferences(SHEET_NAMES.INVESTMENTS, 15, renameMap);
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("투자 종목코드 업데이트 실패"); 
    }
};

export const fetchBatchData = async () => {
    if (isTestMode) {
        await new Promise(r => setTimeout(r, 500));
        return { 
            transactions: [...mockTransactions].reverse(), 
            accounts: [...mockAccounts], 
            subcategories: [...mockSubcategories], 
            incomeSources: [...mockIncomeSources], 
            managedAccounts: [...mockManagedAccounts],
            keywords: [...mockKeywords],
            hiddenCategories: [...mockHiddenCategories],
            hiddenAccounts: [...mockHiddenAccounts],
            subscriptions: [...mockSubscriptions],
            investments: [...mockInvestments],
            investmentGoals: [...mockInvestmentGoals],
            subscriptionTags: [...mockSubscriptionTags],
            baseDay: mockBaseDay,
            fourthTab: mockFourthTab as Tab,
            investmentAnnualReturns: {}
        };
    }
    
    const ranges = [
        `'${SHEET_NAMES.RECORDS}'!A2:P`, 
        `'${SHEET_NAMES.ACCOUNTS}'!A2:A`, 
        `'${SHEET_NAMES.SUBCATEGORIES}'!A2:A`, 
        `'${SHEET_NAMES.INCOME_SOURCES}'!A2:A`, 
        `'${SHEET_NAMES.MANAGED_ACCOUNTS}'!A2:A`, 
        `'${SHEET_NAMES.FIXED_KEYWORDS}'!A2:C`, 
        `'${SHEET_NAMES.BUDGET_VISIBILITY}'!A2:B`, 
        `'${SHEET_NAMES.SUBSCRIPTIONS}'!A2:I`, 
        `'${SHEET_NAMES.INVESTMENTS}'!A2:R`, 
        `'${SHEET_NAMES.INVESTMENT_GOALS}'!A2:B`, 
        `'${SHEET_NAMES.SUBSCRIPTION_TAGS}'!A2:A`, 
        `'${SHEET_NAMES.SETTINGS}'!A2:B`,
        `'${SHEET_NAMES.INVESTMENT_ACCOUNT_TYPES}'!A2:A`,
        `'${SHEET_NAMES.INVESTMENT_BROKERS}'!A2:A`,
        `'${SHEET_NAMES.INVESTMENT_STOCK_CODES}'!A2:A`,
        `'${SHEET_NAMES.INVESTMENT_ACCOUNTS}'!A2:I`,
        `'${SHEET_NAMES.INVESTMENT_ANNUAL_RETURNS}'!A2:B`
    ];
    
    let response;
    try { 
        response = await window.gapi.client.sheets.spreadsheets.values.batchGet({ 
            spreadsheetId: currentSpreadsheetId, 
            ranges 
        }); 
    } catch (e: any) { 
        try { 
            await ensureAllSheetsExist(); 
            response = await window.gapi.client.sheets.spreadsheets.values.batchGet({ 
                spreadsheetId: currentSpreadsheetId, 
                ranges 
            }); 
        } catch (retryError) { 
            throw retryError; 
        } 
    }

    try {
        const valueRanges = response.result.valueRanges;
        
        const transactions = (valueRanges[0]?.values || []).map((row: any[], index: number) => ({ 
            inputTime: row[0] || '', 
            category: String(row[1] || '').trim(), 
            subcategory: String(row[2] || '').trim(), 
            cost: parseFloat(String(row[3] || '0').replace(/,/g, '')) || 0, 
            account: String(row[4] || '').trim(), 
            note: String(row[5] || ''), 
            date: normalizeDate(row[6]) || normalizeDate(row[0]), 
            settlement: row[7] || '', 
            imageUrl: convertToDirectLink(row[10] || ''), 
            uniqueId: row[11] || `AUTO_${index}`, 
            transferId: row[12] || '', 
            settlementFromAccount: row[13] || '', 
            settlementToAccount: row[14] || '', 
            incomeSource: row[15] || '', 
            rowIndex: index + 2 
        })).reverse();
        
        const accounts = (valueRanges[1]?.values || []).flat();
        const subcategories = (valueRanges[2]?.values || []).flat();
        const incomeSources = (valueRanges[3]?.values || []).flat();
        const managedAccounts = (valueRanges[4]?.values || []).flat();
        
        const keywords = (valueRanges[5]?.values || []).map(r => ({ 
            keyword: r[0], 
            category: r[1], 
            expectedAmount: parseFloat(r[2] || '0') 
        }));
        
        const visibilityRows = valueRanges[6]?.values || [];
        const hiddenCategories = visibilityRows
            .filter(r => r[0] === 'category')
            .map(r => r[1]);
        const hiddenAccounts = visibilityRows
            .filter(r => r[0] === 'account')
            .map(r => r[1]);
            
        const subscriptions = (valueRanges[7]?.values || []).map((row: any[], index: number) => ({ 
            id: row[0] || `SUB_${index}`, 
            name: row[1] || '', 
            cost: parseFloat(row[2] || '0'), 
            cycle: row[3] || '', 
            paymentMethod: row[4] || '', 
            startDate: row[5] || '', 
            tag: row[6] || '', 
            memo: row[7] || '', 
            status: row[8] || '구독', 
            rowIndex: index + 2 
        }));
        
        const investments = (valueRanges[8]?.values || []).map((row: any[], index: number) => {
            // 기존 컬럼 구조 유지
            // 0: ID, 1: 종목명, 2: 구매처, 3: 카테고리, 4: 매수일, 5: 주당단가, 6: 매수수량, 7: 총구매액, 8: 목표비율, 9: 목표매도가, 10: 실제매도가, 11: 수익실현금, 12: 비고, 13: 현재가, 14: 종목코드
            
            // 비고(note)에 계좌 유형/계좌 연결 정보가 있다면 추출
            let note = row[12] || '';
            let accountType = '일반';
            let accountId: string | undefined = undefined;

            const accMatch = String(note).match(/\[ACC:([^\]]+)\]/);
            if (accMatch && accMatch[1]) {
                accountId = accMatch[1].trim();
                note = String(note).replace(accMatch[0], '').trim();
            }
            
            if (note.includes('[ISA]')) {
                accountType = 'ISA';
                note = note.replace('[ISA]', '').trim();
            } else if (note.includes('[IRP]')) {
                accountType = 'IRP';
                note = note.replace('[IRP]', '').trim();
            } else if (note.includes('[연금저축]')) {
                accountType = '연금저축';
                note = note.replace('[연금저축]', '').trim();
            }

            return { 
                id: row[0] || `INV_${index}`, 
                accountId,
                name: row[1] || '', 
                broker: row[2] || '', 
                category: row[3] || '', 
                accountType: accountType as any,
                date: row[4] || '', 
                price: parseFloat(String(row[5] || '0').replace(/,/g, '')) || 0, 
                quantity: parseFloat(String(row[6] || '0').replace(/,/g, '')) || 0, 
                totalCost: parseFloat(String(row[7] || '0').replace(/,/g, '')) || 0, 
                targetRatio: parseFloat(String(row[8] || '0').replace(/,/g, '')) || 0, 
                targetPrice: parseFloat(String(row[9] || '0').replace(/,/g, '')) || 0, 
                actualPrice: parseFloat(String(row[10] || '0').replace(/,/g, '')) || 0, 
                realizedProfit: parseFloat(String(row[11] || '0').replace(/,/g, '')) || 0, 
                note: note, 
                currentPrice: parseFloat(String(row[13] || '0').replace(/,/g, '')) || 0, 
                stockCode: row[14] || '', 
                sellDate: row[15] || '',
                soldQuantity: parseFloat(String(row[16] || '0').replace(/,/g, '')) || 0,
                soldPrice: parseFloat(String(row[17] || '0').replace(/,/g, '')) || 0,
                rowIndex: index + 2 
            };
        });
        
        const investmentGoals = (valueRanges[9]?.values || []).map(r => ({ 
            category: r[0], 
            targetRatio: parseFloat(r[1] || '0') 
        }));
        
        const subscriptionTags = (valueRanges[10]?.values || []).flat();
        
        const settingsRows = valueRanges[11]?.values || [];
        const baseDayRow = settingsRows.find(r => r[0] === 'BaseDay');
        const baseDay = baseDayRow ? parseInt(baseDayRow[1]) : 1;
        const fourthTabRow = settingsRows.find(r => r[0] === 'FourthTab');
        const fourthTab = fourthTabRow ? fourthTabRow[1] : null;
        const isaStartDateRow = settingsRows.find(r => r[0] === 'ISA_StartDate');
        const isaStartDate = isaStartDateRow ? isaStartDateRow[1] : null;
        const irpStartDateRow = settingsRows.find(r => r[0] === 'IRP_StartDate');
        const irpStartDate = irpStartDateRow ? irpStartDateRow[1] : null;
        
        const investmentAccountTypes = (valueRanges[12]?.values || []).flat();
        const investmentBrokers = (valueRanges[13]?.values || []).flat();
        const investmentStockCodes = (valueRanges[14]?.values || []).flat();
        
        const investmentAccounts = (valueRanges[15]?.values || []).map((row: any[], index: number) => ({
            id: row[0] || `ACC_${index}`,
            accountType: row[1] || '',
            bankName: row[2] || '',
            accountName: row[3] || '',
            accountNumber: row[4] || '',
            openDate: row[5] || '',
            deposit: parseFloat(String(row[6] || '0').replace(/,/g, '')) || 0,
            closeDate: row[7] || '',
            note: row[8] || '',
            rowIndex: index + 2
        }));

        const investmentAnnualReturns = (valueRanges[16]?.values || []).reduce((acc: Record<number, number | null>, row: any[]) => {
            const y = parseInt(String(row[0] || '').trim(), 10);
            const vRaw = String(row[1] ?? '').trim();
            if (!Number.isFinite(y)) return acc;
            if (vRaw === '') { acc[y] = null; return acc; }
            const v = parseFloat(vRaw.replace(/,/g, ''));
            acc[y] = Number.isFinite(v) ? v : null;
            return acc;
        }, {});

        return { 
            transactions, 
            accounts, 
            subcategories, 
            incomeSources, 
            managedAccounts, 
            keywords, 
            hiddenCategories, 
            hiddenAccounts, 
            subscriptions, 
            investments, 
            investmentGoals, 
            subscriptionTags, 
            baseDay, 
            fourthTab,
            isaStartDate,
            irpStartDate,
            investmentAccountTypes,
            investmentBrokers,
            investmentStockCodes,
            investmentAccounts,
            investmentAnnualReturns
        };
    } catch (e) { 
        throw new Error("Data parsing error"); 
    }
};

export const updateSetting = async (key: string, value: string | number) => {
    if (isTestMode) return;
    try {
        await ensureAllSheetsExist();
        const res = await window.gapi.client.sheets.spreadsheets.values.get({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.SETTINGS}'!A2:B` 
        });
        const rows = res.result.values || [];
        const index = rows.findIndex((r: any[]) => r[0] === key);
        
        if (index !== -1) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.SETTINGS}'!B${index + 2}`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: [[value]] } 
            }); 
        } else { 
            await window.gapi.client.sheets.spreadsheets.values.append({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.SETTINGS}'!A1`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: [[key, value]] } 
            }); 
        }
    } catch (e) { 
        console.error(`Failed to update setting ${key}`, e); 
    }
};

export const updateFixedKeywords = async (keywords: FixedKeyword[]) => {
    if (isTestMode) { 
        mockKeywords = [...keywords]; 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.FIXED_KEYWORDS}'!A2:C500` 
        });
        if (keywords.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.FIXED_KEYWORDS}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: keywords.map(k => [k.keyword, k.category, k.expectedAmount]) } 
            }); 
        }
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("고정 키워드 관리 시트 업데이트 실패."); 
    }
};

export const updateVisibilitySettings = async (hiddenCategories: string[], hiddenAccounts: string[]) => {
    if (isTestMode) { 
        mockHiddenCategories = [...hiddenCategories]; 
        mockHiddenAccounts = [...hiddenAccounts]; 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.BUDGET_VISIBILITY}'!A2:B` 
        });
        const rows = [
            ...hiddenCategories.map(name => ['category', name]), 
            ...hiddenAccounts.map(name => ['account', name])
        ];
        if (rows.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.BUDGET_VISIBILITY}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: rows } 
            }); 
        }
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("숨김 설정 시트 업데이트 실패."); 
    }
};

export const addTransaction = async (data: Omit<Transaction, 'rowIndex'>) => {
    if (isTestMode) { 
        mockTransactions.push({ ...data, rowIndex: 99 }); 
        return; 
    }
    try {
        await ensureAllSheetsExist();
        let imageUrl = data.imageUrl?.startsWith('data:image') 
            ? await uploadImageToDrive(data.imageUrl) 
            : data.imageUrl || "";
            
        const row = [
            new Date().toISOString(), 
            data.category, 
            data.subcategory, 
            data.cost, 
            data.account, 
            data.note, 
            data.date, 
            data.settlement, 
            "", "", 
            imageUrl, 
            data.uniqueId, 
            "", 
            data.settlementFromAccount || "", 
            data.settlementToAccount || "", 
            data.incomeSource || ""
        ];
        
        await window.gapi.client.sheets.spreadsheets.values.append({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.RECORDS}'!A1`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values: [row] } 
        });
        
        // CRITICAL RESTORED: Horse 계정 동기화 호출
        await syncToGulbiIfHorse(data, currentSpreadsheetId);
    } catch (e) {
        throw e;
    }
};

export const addTransfer = async (amount: number, fromAccount: string, toAccount: string, date: string, note: string, settlement: string) => {
    const transferId = `TRF_${Date.now()}`;
    const now = new Date().toISOString();
    const row1 = [now, '➡️이동', '이동(출금)', -Math.abs(amount), fromAccount, note, date, settlement, "", "", "", generateUniqueId(), transferId, "", "", ""];
    const row2 = [now, '➡️이동', '이동(입금)', Math.abs(amount), toAccount, note, date, settlement, "", "", "", generateUniqueId(), transferId, "", "", ""];
    
    if (isTestMode) {
        mockTransactions.push({ inputTime: now, category: '➡️이동', subcategory: '이동(출금)', cost: -amount, account: fromAccount, note, date, settlement, uniqueId: row1[11] as string, transferId, rowIndex: 100 });
        mockTransactions.push({ inputTime: now, category: '➡️이동', subcategory: '이동(입금)', cost: amount, account: toAccount, note, date, settlement, uniqueId: row2[11] as string, transferId, rowIndex: 101 });
        return;
    }
    
    try {
        await ensureAllSheetsExist();
        await window.gapi.client.sheets.spreadsheets.values.append({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.RECORDS}'!A1`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values: [row1, row2] } 
        });
    } catch (e) {
        throw e;
    }
};

export const updateTransaction = async (rowIndex: number, data: Transaction) => {
    if (isTestMode) { 
        const idx = mockTransactions.findIndex(t => t.uniqueId === data.uniqueId); 
        if (idx !== -1) mockTransactions[idx] = data; 
        return; 
    }
    try {
        let imageUrl = data.imageUrl?.startsWith('data:image') 
            ? await uploadImageToDrive(data.imageUrl) 
            : data.imageUrl || "";
            
        const row = [
            data.inputTime, 
            data.category, 
            data.subcategory, 
            data.cost, 
            data.account, 
            data.note, 
            data.date, 
            data.settlement, 
            "", "", 
            imageUrl, 
            data.uniqueId, 
            data.transferId || "", 
            data.settlementFromAccount || "", 
            data.settlementToAccount || "", 
            data.incomeSource || ""
        ];
        
        await window.gapi.client.sheets.spreadsheets.values.update({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.RECORDS}'!A${rowIndex}:P${rowIndex}`, 
            valueInputOption: 'USER_ENTERED', 
            resource: { values: [row] } 
        });
        
        // CRITICAL RESTORED: Horse 계정 동기화 호출
        await syncToGulbiIfHorse(data, currentSpreadsheetId);
    } catch (e) {
        throw e;
    }
};

export const deleteTransaction = async (uniqueId: string) => {
    if (isTestMode) { 
        mockTransactions = mockTransactions.filter(t => t.uniqueId !== uniqueId); 
        return; 
    }
    try {
        const all = await fetchBatchData();
        const target = all.transactions.find(t => t.uniqueId === uniqueId);
        if (target && target.rowIndex) {
            const metadata = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: currentSpreadsheetId });
            const sheetId = metadata.result.sheets.find((s:any) => s.properties.title === SHEET_NAMES.RECORDS).properties.sheetId;
            await window.gapi.client.sheets.spreadsheets.batchUpdate({ 
                spreadsheetId: currentSpreadsheetId, 
                resource: { 
                    requests: [{ 
                        deleteDimension: { 
                            range: { 
                                sheetId, 
                                dimension: "ROWS", 
                                startIndex: target.rowIndex - 1, 
                                endIndex: target.rowIndex 
                            } 
                        } 
                    }] 
                } 
            });
        }
    } catch (e) {
        throw e;
    }
};

export const checkSpreadsheetAccess = async () => { 
    if (isTestMode) return true; 
    try { 
        await window.gapi.client.sheets.spreadsheets.get({ 
            spreadsheetId: currentSpreadsheetId, 
            fields: 'spreadsheetId' 
        }); 
        return true; 
    } catch (e) { 
        return false; 
    } 
};

export const requestManualPermission = () => { 
    if (tokenClient) tokenClient.requestAccessToken({ prompt: 'consent' }); 
};

export const updateManagedAccounts = async (accounts: string[]) => {
    if (isTestMode) { 
        mockManagedAccounts = [...accounts]; 
        return; 
    }
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.MANAGED_ACCOUNTS}'!A2:A` 
        });
        if (accounts.length > 0) { 
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.MANAGED_ACCOUNTS}'!A2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: accounts.map(a => [a]) } 
            }); 
        }
    } catch (e) { 
        await ensureAllSheetsExist(); 
        throw new Error("대시보드 통장 업데이트 실패"); 
    }
};

export const addInvestmentAccount = async (account: Omit<import('../types').InvestmentAccount, 'rowIndex'>) => {
    if (isTestMode) return;
    try {
        const row = [
            account.id,
            account.accountType,
            account.bankName,
            account.accountName,
            account.accountNumber,
            account.openDate,
            account.deposit,
            account.closeDate || '',
            account.note || ''
        ];
        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: currentSpreadsheetId,
            range: `'${SHEET_NAMES.INVESTMENT_ACCOUNTS}'!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [row] }
        });
    } catch (e) {
        throw e;
    }
};

export const updateInvestmentAccount = async (rowIndex: number, account: import('../types').InvestmentAccount) => {
    if (isTestMode) return;
    try {
        const row = [
            account.id,
            account.accountType,
            account.bankName,
            account.accountName,
            account.accountNumber,
            account.openDate,
            account.deposit,
            account.closeDate || '',
            account.note || ''
        ];
        await window.gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: currentSpreadsheetId,
            range: `'${SHEET_NAMES.INVESTMENT_ACCOUNTS}'!A${rowIndex}:I${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [row] }
        });
    } catch (e) {
        throw e;
    }
};

export const deleteInvestmentAccount = async (rowIndex: number) => {
    if (isTestMode) return;
    try {
        const metadata = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: currentSpreadsheetId });
        const sheetId = metadata.result.sheets.find((s:any) => s.properties.title === SHEET_NAMES.INVESTMENT_ACCOUNTS).properties.sheetId;
        await window.gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: currentSpreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: "ROWS",
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }]
            }
        });
    } catch (e) {
        throw e;
    }
};

export const fillMissingIds = async () => {
    try {
        const res = await window.gapi.client.sheets.spreadsheets.values.get({ 
            spreadsheetId: currentSpreadsheetId, 
            range: `'${SHEET_NAMES.RECORDS}'!A2:L` 
        });
        const rows = res.result.values || [];
        let count = 0;
        const ids = rows.map((r: any[]) => { 
            if ((r[0] || r[3]) && (!r[11] || !r[11].trim())) { 
                count++; 
                return [generateUniqueId()]; 
            } 
            return [r[11] || '']; 
        });
        if (count > 0) {
            await window.gapi.client.sheets.spreadsheets.values.update({ 
                spreadsheetId: currentSpreadsheetId, 
                range: `'${SHEET_NAMES.RECORDS}'!L2`, 
                valueInputOption: 'USER_ENTERED', 
                resource: { values: ids } 
            });
        }
        return `${count}건 생성 완료`;
    } catch (e) {
        throw e;
    }
};
