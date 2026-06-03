# Project: 260516_굴비쥬스가계부 빌드버전4

## Description
No description

## Notes & Instructions
# My Notes\n\n- A new project ready for your ideas.# [Role & Task]
당신은 시니어 프론트엔드 개발자입니다. 
현재 `[파일명.tsx]` 컴포넌트를 수정/고도화해야 합니다.
가장 중요한 목표는 **"기존 기능의 완전한 보존"**과 **"신규 기능의 완벽한 통합"**입니다.

# [1. 신규 요구사항 (New Features)]
다음 기능을 새롭게 추가하거나 변경하세요:
1. [구체적인 요구사항 1 - 예: 상단에 달력 뷰 추가]
2. [구체적인 요구사항 2 - 예: 리스트 필터링 로직 변경]
3. [구체적인 요구사항 3]

# [2. ⚠️ 절대 보존해야 할 핵심 기능 (Critical Preservation List)]
이전 코드에 있던 다음 기능들은 **단 하나도 누락되거나 단순화되어서는 안 됩니다.**
(Flash 모델은 이 부분들을 자주 실수하므로 주의하세요.)

* **[상세 모달 UI]:** 모달 내부의 모든 입력 필드(Input, Select)와 버튼을 그대로 유지하세요.
* **[핸들러 로직]:** `handleUpdate`, `handleDelete`, `toggleSign` 등 모든 이벤트 핸들러를 유지하세요.
* **[이미지/파일 처리]:** 파일 선택 input, 미리보기, 삭제, 업로드 로직을 완벽하게 포함하세요.
* **[조건부 렌더링]:** 특정 조건(예: '수입' 카테고리)일 때만 보이는 UI 로직을 유지하세요.

# [3. 🚫 코드 작성 제약 사항 (Strict Constraints)]
* **NO Placeholders:** `// ...기존과 동일...`, `// ...rest of code`와 같은 주석으로 코드를 생략하지 마세요.
* **Full Output:** import 문부터 export default까지, **파일의 처음부터 끝까지 모든 코드를 출력**하세요.
* **Library:** 아이콘은 외부 라이브러리 대신 SVG 코드를 직접 사용(기존 방식 유지)하세요.
* **Logic:** 잔액 계산 등 복잡한 로직은 `sortTransactionsChronologically` 등 검증된 함수를 사용하세요.

# [4. 출력 요청]
위 지침을 모두 준수하여, 바로 복사/붙여넣기 할 수 있는 **완전한(Complete) 코드**를 작성해 주세요.

---

## Google Apps Script (code.gs)
```javascript
// Your Google Apps Script code here
```

---

## HTML (App.tsx)
```html

import React, { useEffect, useState, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Input from './pages/Input';
import History from './pages/History';
import Settings from './pages/Settings';
import Subscriptions from './pages/Subscriptions';
import Investments from './pages/Investments';
import { Tab, Transaction, DashboardData, Theme, Subscription, AppMode, InvestmentItem, InvestmentGoal, FixedKeyword } from './types';
import { initGoogleClient, handleLogin, fetchBatchData, handleLogout, setTestMode, setConfig, updateFourthTabSetting } from './services/googleSheetsService';
import { processDashboardData } from './utils/analysisUtils';
import { UIProvider, useUI } from './contexts/UIContext';

const MainApp: React.FC = () => {
  const { showSnackbar } = useUI();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [isTestModeEnabled, setIsTestModeEnabled] = useState(false);
  
  // App Configuration
  const [appMode, setAppMode] = useState<AppMode>('default');
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [fourthTab, setFourthTab] = useState<Tab>(Tab.SUBSCRIPTION); 

  const [theme, setTheme] = useState<Theme>('dark');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [investmentGoals, setInvestmentGoals] = useState<InvestmentGoal[]>([]);
  const [fixedKeywords, setFixedKeywords] = useState<FixedKeyword[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [managedAccounts, setManagedAccounts] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [incomeSources, setIncomeSources] = useState<string[]>([]); 
  const [subscriptionTags, setSubscriptionTags] = useState<string[]>([]);
  const [baseDay, setBaseDay] = useState<number>(1);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Test Mode Password UI State
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  
  const selectedConfigRef = useRef<AppMode>('default');

  useEffect(() => {
    // 1. Theme & Settings Restore
    const savedTheme = localStorage.getItem('theme') as Theme;
    setTheme(savedTheme || 'dark');
    
    const savedMode = localStorage.getItem('appMode') as AppMode || 'default';
    selectedConfigRef.current = savedMode;

    // 모드별 저장된 탭 불러오기 (default는 항상 subscription)
    const savedFourthTab = savedMode === 'gulbi' 
        ? localStorage.getItem('fourthTab_gulbi') as Tab 
        : Tab.SUBSCRIPTION;
    
    if (savedFourthTab) setFourthTab(savedFourthTab);

    // 2. Initialize Google Client
    initGoogleClient((signedIn, userEmail) => {
      console.log(`Auth status: ${signedIn}, User: ${userEmail}`);
      setIsGoogleAuth(signedIn);
      setIsInitializing(false);
      
      if (signedIn) {
        if (localStorage.getItem('appMode')) {
            enterApp(localStorage.getItem('appMode') as AppMode);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fix: Added toggleTheme function which was missing and causing a compilation error.
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const enterApp = async (mode: AppMode) => {
      if (mode === 'test') {
          activateTestMode();
          return;
      }
      
      setAppMode(mode);
      setConfig(mode as 'default' | 'gulbi');
      localStorage.setItem('appMode', mode);
      
      // 모드 진입 시 탭 설정 처리
      if (mode === 'default') {
          // 굴비쥬스 모드는 항상 '구독' 고정
          setFourthTab(Tab.SUBSCRIPTION);
      } else if (mode === 'gulbi') {
          // 굴비 모드는 저장된 값 불러오기 (없으면 '투자'가 기본)
          const saved = localStorage.getItem('fourthTab_gulbi') as Tab;
          if (!saved || (saved !== Tab.INVESTMENT && saved !== Tab.SUBSCRIPTION)) {
              setFourthTab(Tab.INVESTMENT);
          } else {
              setFourthTab(saved);
          }
      }
      
      setIsLoggedIn(true);
      await loadData(mode);
  };

  const handleSetFourthTab = (tab: Tab) => {
      // 설정 변경은 현재 모드(주로 굴비)에만 영향을 줌
      setFourthTab(tab);
      if (appMode === 'gulbi') {
          localStorage.setItem('fourthTab_gulbi', tab);
          if (!isTestModeEnabled) {
              updateFourthTabSetting(tab); 
          }
      }
  };

  const logout = () => {
    handleLogout();
    localStorage.removeItem('appMode');
    setIsLoggedIn(false);
    setIsGoogleAuth(false);
    setIsTestModeEnabled(false);
    setAppMode('default');
    setShowPasswordInput(false);
    setPasswordValue('');
  };

  const loadData = async (currentMode?: AppMode) => {
    const targetMode = currentMode || appMode;
    setIsDataLoading(true);
    try {
      const data = await fetchBatchData();

      setTransactions(data.transactions);
      setSubscriptions(data.subscriptions || []);
      setInvestments(data.investments || []);
      setInvestmentGoals(data.investmentGoals || []);
      setFixedKeywords(data.keywords || []);
      setAccounts(data.accounts);
      setSubcategories(data.subcategories);
      setIncomeSources(data.incomeSources || []); 
      setSubscriptionTags(data.subscriptionTags || []);
      setBaseDay(data.baseDay || 1);
      
      // 시트에 저장된 메뉴 설정 반영 (굴비 모드일 때만)
      if (targetMode === 'gulbi') {
          if (data.fourthTab && (data.fourthTab === Tab.INVESTMENT || data.fourthTab === Tab.SUBSCRIPTION)) {
              setFourthTab(data.fourthTab);
              localStorage.setItem('fourthTab_gulbi', data.fourthTab);
          }
      } else {
          // default 모드면 강제로 구독 유지
          setFourthTab(Tab.SUBSCRIPTION);
      }

      const finalManaged = data.managedAccounts.length > 0 ? data.managedAccounts : data.accounts;
      setManagedAccounts(finalManaged);

      const dashboard = processDashboardData(
          data.transactions, 
          finalManaged, 
          data.hiddenCategories, 
          data.hiddenAccounts,
          data.baseDay || 1
      );
      setDashboardData(dashboard);

    } catch (error: any) {
      console.error("Failed to load data", error);
      const code = error.result?.error?.code;
      if (code === 403) {
          showSnackbar("⛔ 구글 시트 접근 권한이 없습니다.", 'error');
          logout();
      } else {
          showSnackbar(`데이터 로딩 실패`, 'error');
      }
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleLoginStart = (type: 'default' | 'gulbi') => {
      if (isInitializing) return;
      if (isGoogleAuth) {
          enterApp(type);
      } else {
          selectedConfigRef.current = type;
          handleLogin();
      }
  };

  const submitTestPassword = () => {
    if (passwordValue === "0127") {
      enterApp('test');
    } else {
      showSnackbar("비밀번호가 올바르지 않습니다.", 'error');
      setPasswordValue('');
    }
  };

  const activateTestMode = () => {
      setTestMode(true);
      setIsTestModeEnabled(true);
      setIsLoggedIn(true);
      setAppMode('default'); 
      setConfig('default'); 
      setFourthTab(Tab.SUBSCRIPTION); 
      loadData('default');
      showSnackbar("테스트 모드가 활성화되었습니다.", 'success');
  };

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 dark:bg-[#121212] p-6 animate-fade-in overflow-y-auto no-scrollbar text-gray-900 dark:text-white">
        <div className="text-6xl mb-6 animate-bounce">💰</div>
        <h1 className="text-3xl font-bold mb-2">GULBZZUS</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center text-sm">
          사용하실 가계부 버전을 선택해 주세요
        </p>
        
        {!showPasswordInput ? (
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button 
              onClick={() => setShowPasswordInput(true)}
              className="p-5 bg-blue-600 border border-blue-500 rounded-2xl shadow-xl hover:bg-blue-700 transition-all group text-left active:scale-95"
            >
                <div className="flex items-center gap-4 text-white">
                    <div className="text-2xl">🧪</div>
                    <div>
                        <div className="font-bold text-base">기능 미리보기</div>
                        <div className="text-[10px] opacity-80">데이터 저장 없이 '굴비쥬스' 기능을 체험합니다.</div>
                    </div>
                </div>
            </button>

            <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Select Budget Type</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
            </div>

            <button 
              onClick={() => handleLoginStart('default')}
              disabled={isInitializing}
              className={`p-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg hover:bg-gray-50 dark:hover:bg-blue-900/10 transition-all group text-left active:scale-95 ${isInitializing ? 'opacity-40 grayscale pointer-events-none' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <div className="text-xl">🐴🐭</div>
                    <div>
                        <div className="font-bold text-lg dark:text-white">굴비쥬스 가계부</div>
                        <div className="text-[10px] text-gray-500">모든 내역을 관리하는 통합 가계부</div>
                    </div>
                </div>
            </button>

            <button 
              onClick={() => handleLoginStart('gulbi')}
              disabled={isInitializing}
              className={`p-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg hover:bg-gray-50 dark:hover:bg-green-900/10 transition-all group text-left active:scale-95 ${isInitializing ? 'opacity-40 grayscale pointer-events-none' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <div className="text-xl">🐴</div>
                    <div>
                        <div className="font-bold text-lg dark:text-white">굴비 가계부</div>
                        <div className="text-[10px] text-gray-500">투자 및 자산 분석 특화 가계부</div>
                    </div>
                </div>
            </button>

            {isInitializing && (
                <div className="flex items-center justify-center gap-2 py-4 animate-pulse">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-[10px] text-gray-400 font-medium">인증 정보 확인 중...</span>
                </div>
            )}
          </div>
        ) : (
             <div className="flex flex-col gap-8 w-full max-w-xs animate-fade-in">
                <div className="text-center">
                    <h2 className="text-2xl font-black">비밀번호 입력</h2>
                    <p className="text-sm text-gray-500 mt-2">인증을 위해 미리보기 비밀번호를 입력하세요.</p>
                </div>
                <input
                    type="password"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitTestPassword()}
                    placeholder="비밀번호"
                    className="w-full bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center text-xl font-bold focus:border-blue-500 focus:ring-4 ring-blue-500/20 outline-none transition-all"
                    autoFocus
                />
                <div className="space-y-3">
                    <button onClick={submitTestPassword} className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black">입력 완료</button>
                    <button onClick={() => setShowPasswordInput(false)} className="w-full text-gray-400 text-sm font-bold">뒤로가기</button>
                </div>
             </div>
        )}
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} title={appMode === 'gulbi' ? "💰 GULB 가계부" : "💰 GULBZZUS 가계부"} fourthTab={fourthTab}>
      {activeTab === Tab.DASHBOARD && (
        <Dashboard 
          data={dashboardData} 
          isLoading={isDataLoading}
          transactions={transactions}
          fixedKeywords={fixedKeywords}
          managedAccounts={managedAccounts}
          allAccounts={accounts}
          refreshData={() => loadData()}
        />
      )}
      {activeTab === Tab.INPUT && <Input subcategories={subcategories} accounts={accounts} incomeSources={incomeSources} refreshData={() => loadData()} dashboardData={dashboardData} />}
      {activeTab === Tab.HISTORY && <History transactions={transactions} refreshData={() => loadData()} subcategories={subcategories} accounts={accounts} incomeSources={incomeSources} />}
      {activeTab === Tab.SUBSCRIPTION && <Subscriptions subscriptions={subscriptions} accounts={accounts} subscriptionTags={subscriptionTags} refreshData={() => loadData()} />}
      {activeTab === Tab.INVESTMENT && <Investments investments={investments} investmentGoals={investmentGoals} refreshData={() => loadData()} />}
      {activeTab === Tab.SETTINGS && (
        <Settings 
          theme={theme} toggleTheme={toggleTheme} isTestMode={isTestModeEnabled} handleLogout={logout} allAccounts={accounts} 
          managedAccounts={managedAccounts} refreshData={() => loadData()} appMode={appMode} fourthTab={fourthTab} setFourthTab={handleSetFourthTab} baseDay={baseDay}
        />
      )}
    </Layout>
  );
};

const App: React.FC = () => (
  <UIProvider>
    <MainApp />
  </UIProvider>
);

export default App;

```


---

## HTML (Layout.tsx)
```html

import React, { useState, useEffect, useRef } from 'react';
import { Tab } from '../types';

interface LayoutProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  children: React.ReactNode;
  title?: string;
  fourthTab: Tab; // Tab.SUBSCRIPTION or Tab.INVESTMENT
}

const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children, title = "💰 GULBZZUS 가계부", fourthTab }) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If scrolling down and past 60px, hide
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setIsVisible(false);
      } else {
        // If scrolling up, show
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-24 max-w-md mx-auto relative shadow-2xl overflow-hidden transition-colors duration-300">
      {/* Header - Smart Hide/Show */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10 max-w-md mx-auto transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="px-5 py-4">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 text-center">
            {title}
          </h1>
        </div>
      </header>

      {/* Main Content - Add top padding to account for fixed header */}
      <main className="pt-20 px-5 animate-fade-in min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#121212]/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 max-w-md mx-auto safe-bottom transition-colors duration-300">
        <div className="flex justify-around items-center h-16 px-1">
          <NavItem 
            active={activeTab === Tab.DASHBOARD} 
            onClick={() => setActiveTab(Tab.DASHBOARD)} 
            icon={<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />} 
            label="대시보드" 
          />
          <NavItem 
            active={activeTab === Tab.INPUT} 
            onClick={() => setActiveTab(Tab.INPUT)} 
            icon={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>} 
            label="입력" 
          />
          <NavItem 
            active={activeTab === Tab.HISTORY} 
            onClick={() => setActiveTab(Tab.HISTORY)} 
            icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>} 
            label="내역" 
          />
          
          {fourthTab === Tab.SUBSCRIPTION ? (
             <NavItem 
                active={activeTab === Tab.SUBSCRIPTION} 
                onClick={() => setActiveTab(Tab.SUBSCRIPTION)} 
                icon={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></>} 
                label="구독" 
             />
          ) : (
             <NavItem 
                active={activeTab === Tab.INVESTMENT} 
                onClick={() => setActiveTab(Tab.INVESTMENT)} 
                icon={<><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></>} 
                label="투자" 
             />
          )}

          <NavItem 
            active={activeTab === Tab.SETTINGS} 
            onClick={() => setActiveTab(Tab.SETTINGS)} 
            icon={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} 
            label="설정" 
          />
        </div>
      </nav>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${active ? 'text-blue-600 dark:text-blue-500 scale-105' : 'text-gray-400 dark:text-zinc-500'}`}
  >
    <svg 
      viewBox="0 0 24 24" 
      width="24" 
      height="24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={active ? 2.5 : 2} 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="mb-1 transition-all duration-300"
    >
      {icon}
    </svg>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default Layout;

```


---

## HTML (constants.ts)
```html
/// <reference types="vite/client" />

// Configuration for Google Sheets API
export const DEFAULT_SPREADSHEET_ID = '1P-fo_FyK89R7WR95ZXjQITISvyqvlgjoRVUvmxem3Yg';
export const DEFAULT_DRIVE_FOLDER_ID = '1lqMLclfgNwiP9v13OPNKd6KHECIx9mzH'; 

export const GULBI_SPREADSHEET_ID = '1gBYSFun-kog7TR5ziByuB5ZmIKDPM9McMh4z9wdh2VI';
export const GULBI_DRIVE_FOLDER_ID = '1D8huePz8BKgDhWFAHY6mbYMeAFGBznE8';

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

```


---

## HTML (index.html)
```html

<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>💰 GULBZZUS 가계부</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```


---

## HTML (index.tsx)
```html
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
```


---

## HTML (metadata.json)
```html
{
  "name": "GULBZZUS Budget",
  "description": "A sophisticated household account book app connected directly to Google Sheets via Google Login.",
  "requestFramePermissions": [
    "camera"
  ],
  "majorCapabilities": [
    "MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"
  ]
}
```


---

## HTML (dashboard.tsx)
```html

import { DashboardData, ExpenseStat, Transaction, PeriodType, DashboardViewMode, FixedKeyword, AverageStat, BankBalance } from '../types';
import { formatCurrency, getCustomMonthRange, sortTransactionsChronologically } from '../utils/analysisUtils';
import { updateTransaction, updateFixedKeywords, updateVisibilitySettings, updateManagedAccounts } from '../services/googleSheetsService';
import { HORSE_ACCOUNTS } from '../constants';
import { useUI } from '../contexts/UIContext';
import React, { useState, useMemo, useEffect, useRef } from 'react';

interface DashboardProps {
  data: DashboardData | null;
  isLoading: boolean;
  transactions: Transaction[];
  fixedKeywords: FixedKeyword[];
  managedAccounts: string[];
  allAccounts: string[];
  refreshData: () => void;
}

// --- Icons ---
const ChevronLeft = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ChevronRight = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const FixedIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" strokeLinecap="round"/><circle cx="12" cy="12" r="3" /></svg>;
const ChartIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const WalletIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
const FlowIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="18" y="3" width="4" height="18" /><rect x="10" y="8" width="4" height="13" /><rect x="2" y="13" width="4" height="8" /></svg>;
const CalendarIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;

// --- Helper Functions ---
const truncate = (text: string, max: number = 25) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '...' : text;
};

// --- Standardized Transaction Card Component ---
const TransactionCard: React.FC<{ t: Transaction; noBg?: boolean; contextAccount?: string; runningBalance?: number }> = ({ t, noBg, contextAccount, runningBalance }) => {
    const isSettlementFrom = contextAccount && t.settlementFromAccount === contextAccount && !HORSE_ACCOUNTS.includes(contextAccount);
    const isSettlementTo = contextAccount && t.settlementToAccount === contextAccount && !HORSE_ACCOUNTS.includes(contextAccount);

    let displayCost = t.cost;
    let costColorClass = "";
    let statusLabel = t.category.replace(/[^\w가-힣]/g, '');

    if (isSettlementFrom) {
        displayCost = -Math.abs(t.cost);
        costColorClass = "text-red-500";
        statusLabel = "정산출금";
    } else if (isSettlementTo) {
        displayCost = Math.abs(t.cost);
        costColorClass = "text-blue-500";
        statusLabel = "정산입금";
    } else {
        const isIncome = t.cost > 0;
        const isTransfer = t.category.includes('이동');
        costColorClass = isTransfer ? (t.subcategory.includes('입금') ? 'text-blue-500' : 'text-red-400') : (isIncome ? 'text-blue-500' : 'text-red-500');
    }
    
    return (
        <div className={`flex items-center justify-between transition-all ${noBg ? 'py-4 px-1' : 'bg-white dark:bg-white/5 border-b border-gray-100 dark:border-white/5 p-4'}`}>
            <div className="flex items-center gap-3 overflow-hidden flex-1">
                <div className="flex flex-col items-center justify-center w-11 h-11 bg-gray-100 dark:bg-white/10 rounded-xl shrink-0 border border-gray-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{t.date.slice(5, 7)}</span>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{t.date.slice(8, 10)}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold shrink-0 ${
                            t.settlement.includes('완료') ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                            t.settlement.includes('대기') ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                            'bg-gray-500/20 text-gray-500 dark:text-gray-400'
                        }`}>
                            {t.settlement.split(' ').pop()}
                        </span>
                        <div className="font-bold text-gray-900 dark:text-white text-sm truncate">
                            {truncate(t.note || t.subcategory)}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden">
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold shrink-0 ${
                            statusLabel.includes('출금') || statusLabel.includes('지출') ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                            statusLabel.includes('입금') || statusLabel.includes('수입') ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                            statusLabel.includes('잔액조정') ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' :
                            'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                            {statusLabel}
                        </span>
                        <span className="font-medium shrink-0">{t.account}</span>
                        <span className="opacity-30 shrink-0">•</span>
                        <span className="truncate">{t.subcategory}</span>
                    </div>
                </div>
            </div>
            <div className="text-right shrink-0 ml-3">
                <div className={`font-black text-sm ${costColorClass}`}>
                    {displayCost > 0 ? '+' : ''}{displayCost.toLocaleString()}
                </div>
                {runningBalance !== undefined && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-bold">
                        잔액: {runningBalance.toLocaleString()}원
                    </div>
                )}
            </div>
        </div>
    );
};

// --- BottomSheetWrapper ---
const BottomSheetWrapper: React.FC<{
    children: React.ReactNode;
    onClose: () => void;
    title: string;
    headerColorClass?: string;
    subtitle?: string;
    noDim?: boolean;
    hideClose?: boolean;
}> = ({ children, onClose, title, headerColorClass = "bg-zinc-900", subtitle, noDim, hideClose }) => {
    const [translateY, setTranslateY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef<number>(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;
        if (diff > 0) setTranslateY(diff);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (translateY > 100) onClose();
        else setTranslateY(0);
    };

    return (
        <div 
            className={`fixed inset-0 z-[80] flex items-end justify-center animate-fade-in pointer-events-auto ${noDim ? 'bg-transparent' : 'bg-black/40 dark:bg-black/60 backdrop-blur-sm'}`} 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-[#121212] w-full max-md rounded-t-[2.5rem] overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[92vh] transition-transform duration-200 ease-out border-t border-gray-100 dark:border-white/5 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
                style={{ transform: `translateY(${translateY}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
            >
                <div className="w-full flex justify-center py-5 shrink-0 cursor-grab active:cursor-grabbing touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                    <div className="w-14 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full"></div>
                </div>
                <div className={`${headerColorClass} px-6 pb-6 pt-0 text-white shrink-0 relative`}>
                    <div className="flex justify-between items-start">
                        <div>
                            {subtitle && <div className="text-[10px] opacity-70 uppercase tracking-widest font-bold mb-1.5">{subtitle}</div>}
                            <div className="text-2xl font-black leading-tight">{title}</div>
                        </div>
                        {!hideClose && (
                            <button onClick={onClose} className="p-2 -mr-2 opacity-50 hover:opacity-100">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        )}
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
};

// --- Donut Chart ---
const DonutChart = ({ data, totalAmount, label }: { data: ExpenseStat[], totalAmount: number, label: string }) => {
  const size = 160;
  const strokeWidth = 20;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const chartData = useMemo(() => {
      if (data.length <= 8) return data;
      const top = data.slice(0, 7);
      const others = data.slice(7).reduce((acc, curr) => acc + curr.amount, 0);
      return [...top, { name: '기타', amount: others, percentage: (others / totalAmount) * 100, color: '#9CA3AF' }];
  }, [data, totalAmount]);

  if (data.length === 0) return <div className="py-8 text-center text-gray-400 text-xs">데이터가 없습니다</div>;

  return (
    <div className="relative flex justify-center items-center h-48">
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-100 dark:text-white/5" />
                {chartData.map((item) => {
                    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                    accumulatedPercent += item.percentage;
                    return <circle key={item.name} cx={center} cy={center} r={radius} fill="none" stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-700" />;
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] text-gray-500 font-medium leading-none mb-1">{label}</span>
                <span className="text-lg font-black text-gray-900 dark:text-white leading-none">{(totalAmount/10000).toFixed(1)}만</span>
            </div>
        </div>
    </div>
  );
};

// --- Main Dashboard ---
const Dashboard: React.FC<DashboardProps> = ({ data: initialData, isLoading, transactions, fixedKeywords, managedAccounts, allAccounts, refreshData }) => {
  const { showSnackbar } = useUI();
  const [viewMode, setViewMode] = useState<DashboardViewMode>('basic');
  const [period, setPeriod] = useState<PeriodType>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());

  // Custom range states
  const [customStartDate, setCustomStartDate] = useState(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
      return new Date().toISOString().split('T')[0];
  });
  
  const [hiddenCategoryNames, setHiddenCategoryNames] = useState<Set<string>>(new Set());
  const [hiddenAccountNames, setHiddenAccountNames] = useState<Set<string>>(new Set());
  const [tempManagedAccounts, setTempManagedAccounts] = useState<Set<string>>(new Set());
  
  const [isEditingCategoryVisibility, setIsEditingCategoryVisibility] = useState(false);
  const [isEditingAccountVisibility, setIsEditingAccountVisibility] = useState(false);
  const [isManagingAccounts, setIsManagingAccounts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [analysisTab, setAnalysisTab] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<ExpenseStat | null>(null);
  const [selectedAvgDetail, setSelectedAvgDetail] = useState<AverageStat | null>(null);
  const [selectedFlowDate, setSelectedFlowDate] = useState<string | null>(null);
  const [flowFilter, setFlowFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordCategory, setNewKeywordCategory] = useState<'수입' | '지출'>('지출');

  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<BankBalance | null>(null);
  const [accountHistoryFilter, setAccountHistoryFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');

  useEffect(() => {
    if (initialData) {
        setHiddenCategoryNames(new Set(initialData.hiddenCategories));
        setHiddenAccountNames(new Set(initialData.hiddenAccounts));
        setTempManagedAccounts(new Set(managedAccounts));
    }
  }, [initialData, managedAccounts]);

  const handleSaveVisibility = async (type: 'category' | 'account') => {
      setIsSaving(true);
      try {
          await updateVisibilitySettings(Array.from(hiddenCategoryNames), Array.from(hiddenAccountNames));
          showSnackbar('숨김 설정 완료', 'success');
          if (type === 'category') setIsEditingCategoryVisibility(false);
          else setIsEditingAccountVisibility(false);
          refreshData();
      } catch (e: any) { showSnackbar(e.message, 'error'); } finally { setIsSaving(false); }
  };

  const handleSaveManagedAccounts = async () => {
      setIsSaving(true);
      try {
          await updateManagedAccounts(Array.from(tempManagedAccounts));
          showSnackbar('대시보드 설정 완료', 'success');
          setIsManagingAccounts(false);
          refreshData();
      } catch (e: any) { showSnackbar(e.message, 'error'); } finally { setIsSaving(false); }
  };

  const handleAddKeyword = async () => {
      if (!newKeyword.trim()) return;
      const updated = [...fixedKeywords, { keyword: newKeyword.trim(), category: newKeywordCategory, expectedAmount: 0 }];
      setIsSaving(true);
      try { await updateFixedKeywords(updated); setNewKeyword(''); refreshData(); } 
      catch (e: any) { showSnackbar(e.message, 'error'); } finally { setIsSaving(false); }
  };

  const handleRemoveKeyword = async (kw: string) => {
      const updated = fixedKeywords.filter(k => k.keyword !== kw);
      setIsSaving(true);
      try { await updateFixedKeywords(updated); refreshData(); } 
      catch (e: any) { showSnackbar(e.message, 'error'); } finally { setIsSaving(false); }
  };

  const { startDate, endDate, label, rangeText } = useMemo(() => {
    const start = new Date(anchorDate); const end = new Date(anchorDate);
    const baseDay = initialData?.baseDay || 1;

    if (period === 'custom') {
        const s = new Date(customStartDate);
        const e = new Date(customEndDate);
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        return {
            startDate: s, endDate: e,
            label: '직접 설정 기간',
            rangeText: `${s.toLocaleDateString()} ~ ${e.toLocaleDateString()}`
        };
    } else if (period === 'week') {
        const diff = start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1);
        start.setDate(diff); start.setHours(0,0,0,0); end.setDate(diff + 6); end.setHours(23,59,59,999);
        return { 
            startDate: start, endDate: end, 
            label: `${start.getMonth()+1}/${start.getDate()}~${end.getMonth()+1}/${end.getDate()}`,
            rangeText: `${start.toLocaleDateString()} ~ ${end.toLocaleDateString()}`
        };
    } else if (period === 'month') {
        const range = getCustomMonthRange(anchorDate, baseDay);
        return { 
            startDate: range.start, endDate: range.end, 
            label: `${range.end.getFullYear()}년 ${range.end.getMonth()+1}월`,
            rangeText: `${range.start.toLocaleDateString()} ~ ${range.end.toLocaleDateString()}`
        };
    } else if (period === 'quarter') {
        const q = Math.floor(start.getMonth() / 3);
        start.setMonth(q * 3); start.setDate(1); start.setHours(0,0,0,0); end.setMonth((q + 1) * 3); end.setDate(0); end.setHours(23,59,59,999);
    } else if (period === 'year') {
        start.setMonth(0, 1); start.setHours(0,0,0,0); end.setMonth(11, 31); end.setHours(23,59,59,999);
    }
    return { 
        startDate: start, endDate: end, 
        label: `${start.getFullYear()}년 ${start.getMonth()+1}월`,
        rangeText: `${start.toLocaleDateString()} ~ ${end.toLocaleDateString()}`
    };
  }, [period, anchorDate, initialData?.baseDay, customStartDate, customEndDate]);

  const filteredTxns = useMemo(() => transactions.filter(t => {
      const d = new Date(t.date); return d >= startDate && d <= endDate;
  }), [transactions, startDate, endDate]);

  const stats = useMemo(() => {
     let inc = 0, exp = 0, trf = 0;
     const expenseMap: Record<string, number> = {};
     const incomeMap: Record<string, number> = {};
     const transferMap: Record<string, number> = {};
     filteredTxns.forEach(t => {
         const amt = Number(t.cost);
         if (t.category.includes('수입')) { inc += amt; incomeMap[t.subcategory] = (incomeMap[t.subcategory] || 0) + amt; }
         else if (t.category.includes('지출')) { const abs = Math.abs(amt); exp += abs; expenseMap[t.subcategory] = (expenseMap[t.subcategory] || 0) + abs; }
         else if (t.category.includes('이동') && t.subcategory === '이동(입금)') { trf += amt; transferMap[t.account] = (transferMap[t.account] || 0) + amt; }
     });
     const createSortedStats = (map: Record<string, number>, total: number) => {
         return Object.entries(map).map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .map((item, i) => ({ ...item, percentage: total > 0 ? (item.amount / total) * 100 : 0, color: ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1', '#EF4444', '#6B7280'][i % 8] }));
     };
     return { income: inc, expense: exp, transfer: trf, balance: inc - exp, expenseStats: createSortedStats(expenseMap, exp), incomeStats: createSortedStats(incomeMap, inc), transferStats: createSortedStats(transferMap, trf) };
  }, [filteredTxns]);

  const flowData = useMemo(() => {
    const map: Record<string, { income: number, expense: number, dateStr: string }> = {};
    if (period === 'week') {
        for (let i = 0; i < 7; i++) {
            const d = new Date(startDate); d.setDate(d.getDate() + i);
            const k = d.toISOString().split('T')[0]; map[k] = { income: 0, expense: 0, dateStr: `${d.getMonth()+1}/${d.getDate()}` };
        }
    } else if (period === 'month' || period === 'custom') {
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        // 기간이 너무 길면 월별로 표시 (예: 62일 이상)
        if (totalDays > 62) {
            let cur = new Date(startDate);
            while (cur <= endDate) {
                const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
                map[k] = { income: 0, expense: 0, dateStr: `${cur.getMonth() + 1}월` };
                cur.setMonth(cur.getMonth() + 1);
            }
        } else {
            for (let i = 0; i <= totalDays; i++) {
                const d = new Date(startDate); d.setDate(startDate.getDate() + i);
                const k = d.toISOString().split('T')[0]; map[k] = { income: 0, expense: 0, dateStr: `${d.getMonth()+1}/${d.getDate()}` };
            }
        }
    } else if (period === 'year' || period === 'quarter') {
        const startMonth = startDate.getMonth(); const endMonth = endDate.getMonth(); const y = startDate.getFullYear();
        for (let m = startMonth; m <= endMonth; m++) {
            const k = `${y}-${String(m + 1).padStart(2, '0')}`; map[k] = { income: 0, expense: 0, dateStr: `${m + 1}월` };
        }
    }
    filteredTxns.forEach(t => {
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const k = (period === 'year' || period === 'quarter' || (period === 'custom' && totalDays > 62)) ? t.date.slice(0, 7) : t.date;
        if (map[k]) {
            if (t.cost > 0 && t.category.includes('수입')) map[k].income += t.cost;
            else if (t.cost < 0 && t.category.includes('지출')) map[k].expense += Math.abs(t.cost);
        }
    });
    return Object.entries(map).map(([key, val]) => ({ key, ...val }));
  }, [filteredTxns, period, startDate, endDate]);

  const maxFlowValue = useMemo(() => Math.max(...flowData.map(d => Math.max(d.income, d.expense)), 10000), [flowData]);
  
  // 현재 선택된 흐름 날짜의 요약 데이터 (기간 변경 시 실시간 반영됨)
  const selectedFlowEntry = useMemo(() => selectedFlowDate ? flowData.find(f => f.key === selectedFlowDate) : null, [selectedFlowDate, flowData]);

  const getBudgetStats = (groupBy: 'subcategory' | 'account') => {
      const map: Record<string, { totalInc: number; totalExp: number; count: number; months: Set<string>; currentTotal: number }> = {};
      transactions.forEach(t => {
          const key = t[groupBy]; if (!map[key]) map[key] = { totalInc: 0, totalExp: 0, count: 0, months: new Set(), currentTotal: 0 };
          const monthKey = t.date.slice(0, 7); const amt = Number(t.cost);
          if (amt > 0) map[key].totalInc += amt; else map[key].totalExp += Math.abs(amt);
          map[key].count++; map[key].months.add(monthKey);
      });
      filteredTxns.forEach(t => { const key = t[groupBy]; if (map[key]) map[key].currentTotal += Math.abs(t.cost); });
      return Object.entries(map).map(([name, data]) => {
          const monthCount = Math.max(data.months.size, 1);
          return { [groupBy]: name, avgIncome: data.totalInc / monthCount, avgExpense: data.totalExp / monthCount, totalIncome: data.totalInc, totalExpense: data.totalExp, count: data.count, monthCount, currentPeriodTotal: data.currentTotal } as AverageStat;
      }).sort((a, b) => (b.avgIncome + b.avgExpense) - (a.avgIncome + a.avgExpense));
  };

  const categoryBudgetStatsRaw = useMemo(() => getBudgetStats('subcategory'), [transactions, filteredTxns]);
  const accountBudgetStatsRaw = useMemo(() => getBudgetStats('account'), [transactions, filteredTxns]);
  const categoryBudgetStatsFiltered = useMemo(() => categoryBudgetStatsRaw.filter(s => !hiddenCategoryNames.has(s.subcategory || '')), [categoryBudgetStatsRaw, hiddenCategoryNames]);
  const accountBudgetStatsFiltered = useMemo(() => accountBudgetStatsRaw.filter(s => !hiddenAccountNames.has(s.account || '')), [accountBudgetStatsRaw, hiddenAccountNames]);

  const fixedAnalysis = useMemo(() => {
      const matchedExp = filteredTxns.filter(t => t.cost < 0 && fixedKeywords.some(k => k.category === '지출' && (t.note + t.subcategory).includes(k.keyword)));
      const matchedInc = filteredTxns.filter(t => t.cost > 0 && fixedKeywords.some(k => k.category === '수입' && (t.note + t.subcategory).includes(k.keyword)));
      return { totalFixedExp: matchedExp.reduce((acc, t) => acc + Math.abs(t.cost), 0), totalFixedInc: matchedInc.reduce((acc, t) => acc + t.cost, 0) };
  }, [filteredTxns, fixedKeywords]);

  const filteredAccountHistory = useMemo(() => {
      if (!selectedAccountForDetail) return [];
      const accountName = selectedAccountForDetail.name;
      const isHorse = HORSE_ACCOUNTS.includes(accountName);

      return transactions.filter(t => {
          const isPrimary = t.account === accountName;
          const isFrom = t.settlementFromAccount === accountName && !isHorse;
          const isTo = t.settlementToAccount === accountName && !isHorse;

          if (!isPrimary && !isFrom && !isTo) return false;
          
          if (accountHistoryFilter === 'all') return true;
          if (accountHistoryFilter === 'expense') {
              return (isPrimary && (t.category.includes('지출') || (t.category.includes('이동') && t.subcategory.includes('출금')))) || isFrom;
          }
          if (accountHistoryFilter === 'income') {
              return (isPrimary && (t.category.includes('수입') || (t.category.includes('이동') && t.subcategory.includes('입금')))) || isTo;
          }
          if (accountHistoryFilter === 'transfer') return t.category.includes('이동');
          return true;
      }).sort((a, b) => b.date.localeCompare(a.date) || b.inputTime.localeCompare(a.inputTime) || b.uniqueId.localeCompare(a.uniqueId));
  }, [selectedAccountForDetail, accountHistoryFilter, transactions]);

  // 계좌별 실시간 잔액 계산 로직 (상세 내역용 - 안정적 정렬 기반)
  const accountRunningBalances = useMemo(() => {
      if (!selectedAccountForDetail) return {};
      const accName = selectedAccountForDetail.name;
      const isHorse = HORSE_ACCOUNTS.includes(accName);

      // 전체 거래를 엄격한 시간 순으로 정렬하여 잔액 변화 추적
      const chronological = sortTransactionsChronologically(transactions)
          .filter(t => t.account === accName || (!isHorse && (t.settlementFromAccount === accName || t.settlementToAccount === accName)));

      const balances: Record<string, number> = {};
      let current = 0;
      chronological.forEach(t => {
          const abs = Math.abs(t.cost);
          // 1. 주 거래 합산
          if (t.account === accName) current += t.cost;
          
          // 2. 가상 정산 합산 (동기화 계좌가 아닐 때만 반영하여 중복 방지)
          if (!isHorse) {
            if (t.settlementFromAccount === accName) current -= abs;
            if (t.settlementToAccount === accName) current += abs;
          }
          balances[t.uniqueId] = current;
      });
      return balances;
  }, [selectedAccountForDetail, transactions]);

  // 선택된 카테고리 상세 보기용 필터링된 데이터 및 합계 계산 (기간 변경 시 실시간 반영)
  const currentCategoryDetailItems = useMemo(() => {
      if (!selectedCategoryDetail) return [];
      return filteredTxns.filter(t => {
          if (analysisTab === 'expense') return t.cost < 0 && t.category.includes('지출') && t.subcategory === selectedCategoryDetail.name;
          if (analysisTab === 'income') return t.cost > 0 && t.category.includes('수입') && t.subcategory === selectedCategoryDetail.name;
          if (analysisTab === 'transfer') return t.category.includes('이동') && t.subcategory === '이동(입금)' && t.account === selectedCategoryDetail.name;
          return false;
      });
  }, [selectedCategoryDetail, filteredTxns, analysisTab]);

  const currentCategoryDetailSum = useMemo(() => {
      return currentCategoryDetailItems.reduce((acc, t) => acc + Math.abs(t.cost), 0);
  }, [currentCategoryDetailItems]);

  const currentCategoryDetailPercentage = useMemo(() => {
      const total = analysisTab === 'expense' ? stats.expense : analysisTab === 'income' ? stats.income : stats.transfer;
      return total > 0 ? (currentCategoryDetailSum / total) * 100 : 0;
  }, [currentCategoryDetailSum, analysisTab, stats]);

  if (isLoading) return <div className="flex h-64 items-center justify-center animate-pulse text-gray-400">데이터 로딩 중...</div>;

  const currentAnalysisStats = analysisTab === 'expense' ? stats.expenseStats : analysisTab === 'income' ? stats.incomeStats : stats.transferStats;
  const currentTotalAmount = analysisTab === 'expense' ? stats.expense : analysisTab === 'income' ? stats.income : stats.transfer;
  const currentLabel = analysisTab === 'expense' ? '총 지출' : analysisTab === 'income' ? '총 수입' : '총 이동';
  const displayAnalysisStats = showAllCategories ? currentAnalysisStats : currentAnalysisStats.slice(0, 5);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      
      {/* 1. Header Navigation */}
      <div className="flex flex-col gap-3">
          <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-xl">
              <button onClick={() => setViewMode('basic')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'basic' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>기본 현황</button>
              <button onClick={() => setViewMode('detail')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'detail' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>상세 분석</button>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar items-center py-1">
              {(['week', 'month', 'quarter', 'year', 'custom'] as const).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${period === p ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'}`}>
                      {p === 'week' ? '주간' : p === 'month' ? '월간' : p === 'quarter' ? '분기' : p === 'year' ? '연간' : '📅 직접설정'}
                  </button>
              ))}
          </div>

          {period === 'custom' && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm animate-fade-in space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon />
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">조회 기간 설정</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                          <input 
                            type="date" 
                            value={customStartDate} 
                            onChange={e => setCustomStartDate(e.target.value)} 
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 h-11 text-xs font-bold dark:text-white outline-none focus:ring-2 ring-blue-500/20 appearance-none"
                          />
                      </div>
                      <span className="text-gray-400 font-bold">~</span>
                      <div className="flex-1 flex flex-col gap-1">
                          <input 
                            type="date" 
                            value={customEndDate} 
                            onChange={e => setCustomEndDate(e.target.value)} 
                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 h-11 text-xs font-bold dark:text-white outline-none focus:ring-2 ring-blue-500/20 appearance-none"
                          />
                      </div>
                  </div>
              </div>
          )}

          <div className="flex flex-col items-center bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between w-full">
                {period !== 'custom' ? (
                    <>
                        <button onClick={() => setAnchorDate(new Date(anchorDate.setMonth(anchorDate.getMonth()-1)))} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><ChevronLeft /></button>
                        <span className="font-black text-gray-800 dark:text-white text-base">{label}</span>
                        <button onClick={() => setAnchorDate(new Date(anchorDate.setMonth(anchorDate.getMonth()+1)))} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"><ChevronRight /></button>
                    </>
                ) : (
                    <div className="flex-1 text-center">
                        <span className="font-black text-gray-800 dark:text-white text-base">선택한 기간 분석</span>
                    </div>
                )}
              </div>
              <div className="mt-1 text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {rangeText}
              </div>
          </div>
      </div>

      {/* 2. BASIC VIEW */}
      {viewMode === 'basic' && (
          <>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
                    <div className="text-[10px] text-gray-500 mb-1">총 수입</div>
                    <div className="text-lg font-black text-green-600 dark:text-green-500">{formatCurrency(stats.income)}</div>
                </div>
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
                    <div className="text-[10px] text-gray-500 mb-1">총 지출</div>
                    <div className="text-lg font-black text-red-500">{formatCurrency(stats.expense)}</div>
                </div>
                <div className="col-span-2 bg-blue-600 dark:bg-blue-700 rounded-2xl p-5 text-white flex justify-between items-center shadow-lg shadow-blue-500/20">
                    <span className="text-sm font-medium opacity-90">기간 내 잔액</span>
                    <span className="text-2xl font-black">{formatCurrency(stats.balance)}</span>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">📊 내역 분석</h3>
                    <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-lg">
                        <button onClick={() => { setAnalysisTab('expense'); setShowAllCategories(false); }} className={`px-3 py-1 text-[11px] rounded-md font-bold transition-all ${analysisTab === 'expense' ? 'bg-white dark:bg-gray-800 shadow text-red-500' : 'text-gray-400'}`}>지출</button>
                        <button onClick={() => { setAnalysisTab('income'); setShowAllCategories(false); }} className={`px-3 py-1 text-[11px] rounded-md font-bold transition-all ${analysisTab === 'income' ? 'bg-white dark:bg-gray-800 shadow text-green-500' : 'text-gray-400'}`}>수입</button>
                        <button onClick={() => { setAnalysisTab('transfer'); setShowAllCategories(false); }} className={`px-3 py-1 text-[11px] rounded-md font-bold transition-all ${analysisTab === 'transfer' ? 'bg-white dark:bg-gray-800 shadow text-blue-500' : 'text-gray-400'}`}>이동</button>
                    </div>
                </div>
                <DonutChart data={currentAnalysisStats} totalAmount={currentTotalAmount} label={currentLabel} />
                <div className="mt-6 space-y-2">
                    {displayAnalysisStats.map(item => (
                        <div key={item.name} onClick={() => setSelectedCategoryDetail(item)} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                <span className="text-gray-600 dark:text-gray-400 font-medium">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold dark:text-white">{formatCurrency(item.amount)}</span>
                                <span className="text-[10px] text-gray-400 w-8 text-right">{item.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    ))}
                    {currentAnalysisStats.length > 5 && (
                        <button onClick={() => setShowAllCategories(!showAllCategories)} className="w-full text-center text-xs text-blue-500 font-medium pt-3 border-t border-gray-100 dark:border-white/5">{showAllCategories ? '접기 ▲' : `전체 항목 보기 (${currentAnalysisStats.length}개) ▼`}</button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">🏦 통장별 잔액</h3>
                    <button onClick={() => setIsManagingAccounts(true)} className="text-[11px] text-blue-500 font-bold px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-all">편집</button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
                {(!initialData || initialData.bankBalances.length === 0) ? (
                    <p className="text-center text-gray-500 py-8 text-sm">데이터가 없습니다.</p>
                ) : (
                    initialData.bankBalances.map((bank) => (
                    <div key={bank.name} onClick={() => { setSelectedAccountForDetail(bank); setAccountHistoryFilter('all'); }} className="flex justify-between items-center py-4 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors cursor-pointer group px-1">
                        <div className="min-w-0">
                            <div className="font-bold text-gray-900 dark:text-white text-[15px] group-hover:text-blue-500 transition-colors truncate">{bank.name}</div>
                            <div className="text-[11px] text-gray-400 mt-1 font-medium">거래 {bank.transactionCount}건</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                            <div className={`font-black text-[15px] ${bank.balance >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500'}`}>
                                {formatCurrency(bank.balance)}
                            </div>
                            <span className="text-gray-300 dark:text-gray-700 font-bold text-lg leading-none">›</span>
                        </div>
                    </div>
                    ))
                )}
                </div>
            </div>

            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🕒 최근 이용 내역</h3>
                <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
                    {initialData?.recentTransactions.length === 0 ? (
                        <p className="text-center text-gray-500 py-8 text-sm">내역이 없습니다.</p>
                    ) : (
                        initialData?.recentTransactions.map((t) => <TransactionCard key={t.uniqueId} t={t} noBg />)
                    )}
                </div>
            </div>
          </>
      )}

      {/* 3. DETAIL VIEW */}
      {viewMode === 'detail' && (
          <div className="space-y-8 animate-fade-in">
              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2"><FlowIcon /> 흐름 분석</h3>
                    <div className="flex bg-gray-100 dark:bg-white/10 p-1 rounded-lg">
                        <button onClick={() => setFlowFilter('all')} className={`px-2 py-1 text-[10px] rounded ${flowFilter === 'all' ? 'bg-white dark:bg-gray-800 shadow text-blue-500 font-bold' : 'text-gray-400'}`}>전체</button>
                        <button onClick={() => setFlowFilter('income')} className={`px-2 py-1 text-[10px] rounded ${flowFilter === 'income' ? 'bg-white dark:bg-gray-800 shadow text-green-500 font-bold' : 'text-gray-400'}`}>수입</button>
                        <button onClick={() => setFlowFilter('expense')} className={`px-2 py-1 text-[10px] rounded ${flowFilter === 'expense' ? 'bg-white dark:bg-gray-800 shadow text-red-500 font-bold' : 'text-gray-400'}`}>지출</button>
                    </div>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                      {flowData.map((d) => {
                          const incW = (d.income / maxFlowValue) * 100; const expW = (d.expense / maxFlowValue) * 100;
                          const showItem = flowFilter === 'all' || (flowFilter === 'income' && d.income > 0) || (flowFilter === 'expense' && d.expense > 0);
                          if (!showItem) return null;
                          return (
                              <div key={d.key} onClick={() => setSelectedFlowDate(d.key)} className="group cursor-pointer">
                                  <div className="flex justify-between items-end mb-1">
                                      <span className="text-[10px] text-gray-500 font-medium">{d.dateStr}</span>
                                      <div className="flex gap-2">
                                          {(flowFilter === 'all' || flowFilter === 'income') && d.income > 0 && <span className="text-[9px] text-green-600 font-bold">{(d.income / 10000).toFixed(1)}만</span>}
                                          {(flowFilter === 'all' || flowFilter === 'expense') && d.expense > 0 && <span className="text-[9px] text-red-600 font-bold">{(d.expense / 10000).toFixed(1)}만</span>}
                                      </div>
                                  </div>
                                  <div className="space-y-[2px]">
                                      {(flowFilter === 'all' || flowFilter === 'income') && <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-green-500/60 group-hover:bg-green-500 transition-all" style={{ width: `${incW}%` }} /></div>}
                                      {(flowFilter === 'all' || flowFilter === 'expense') && <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-red-500/60 group-hover:bg-red-500 transition-all" style={{ width: `${expW}%` }} /></div>}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><FixedIcon /> 고정 내역 키워드 관리</h3>
                  <div className="flex bg-gray-100 dark:bg-white/10 rounded-xl p-1 mb-4">
                      <button onClick={() => setNewKeywordCategory('지출')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${newKeywordCategory === '지출' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}>지출 키워드</button>
                      <button onClick={() => setNewKeywordCategory('수입')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${newKeywordCategory === '수입' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500'}`}>수입 키워드</button>
                  </div>
                  <div className="flex flex-nowrap gap-2 mb-6">
                      <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="키워드 입력" className="flex-1 bg-gray-100 dark:bg-white/5 rounded-lg px-3 py-2 text-sm outline-none dark:text-white min-w-0" />
                      <button onClick={handleAddKeyword} disabled={isSaving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold active:scale-95 disabled:opacity-50 shrink-0 min-w-[64px]">등록</button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                            <span className="text-[10px] text-red-500 font-bold uppercase block mb-1">고정 지출 합계</span>
                            <div className="text-lg font-black text-red-600 dark:text-red-400">{formatCurrency(fixedAnalysis.totalFixedExp)}</div>
                        </div>
                        <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                            <span className="text-[10px] text-green-600 font-bold uppercase block mb-1">고정 수입 합계</span>
                            <div className="text-lg font-black text-green-600 dark:text-green-400">{formatCurrency(fixedAnalysis.totalFixedInc)}</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {fixedKeywords.map(k => (
                            <span key={k.keyword + k.category} className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border shadow-sm ${k.category === '수입' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-white/10 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}`}>
                                <span className="opacity-60">{k.category === '수입' ? '💰' : '💸'}</span>{k.keyword}<button onClick={() => handleRemoveKeyword(k.keyword)} className="text-[10px] opacity-40 hover:opacity-100">✕</button>
                            </span>
                        ))}
                    </div>
                  </div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><ChartIcon /> 카테고리별 예산 지표</h3>
                    <button onClick={() => setIsEditingCategoryVisibility(true)} className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
                      {categoryBudgetStatsFiltered.slice(0, 10).map(avg => (
                          <div key={avg.subcategory} onClick={() => setSelectedAvgDetail(avg)} className="py-4 px-1 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors cursor-pointer group">
                              <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2"><span className="text-sm font-bold dark:text-white group-hover:text-blue-500">{avg.subcategory}</span><span className="text-[9px] bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">{avg.monthCount}개월 평균</span></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><div className="text-[9px] text-gray-400 uppercase">평균 수입</div><div className="text-xs font-bold text-green-600">+{formatCurrency(avg.avgIncome)}</div></div>
                                  <div><div className="text-[9px] text-gray-400 uppercase">평균 지출</div><div className="text-xs font-bold text-red-500">-{formatCurrency(avg.avgExpense)}</div></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><WalletIcon /> 통장별 예산 지표</h3>
                    <button onClick={() => setIsEditingAccountVisibility(true)} className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-white/5 border-t border-gray-100 dark:border-white/5">
                      {accountBudgetStatsFiltered.slice(0, 10).map(avg => (
                          <div key={avg.account} onClick={() => setSelectedAvgDetail(avg)} className="py-4 px-1 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors cursor-pointer group">
                              <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2"><span className="text-sm font-bold dark:text-white group-hover:text-blue-500">{avg.account}</span><span className="text-[9px] bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">{avg.monthCount}개월 평균</span></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><div className="text-[9px] text-gray-400 uppercase">평균 입금</div><div className="text-xs font-bold text-green-600">+{formatCurrency(avg.avgIncome)}</div></div>
                                  <div><div className="text-[9px] text-gray-400 uppercase">평균 출금</div><div className="text-xs font-bold text-red-500">-{formatCurrency(avg.avgExpense)}</div></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- BOTTOM SHEETS --- */}
      {selectedAccountForDetail && (
          <BottomSheetWrapper onClose={() => setSelectedAccountForDetail(null)} title={selectedAccountForDetail.name} subtitle="통장 상세" headerColorClass="bg-zinc-900" noDim hideClose>
              <div className="bg-zinc-800/20 dark:bg-white/5 px-6 py-4 flex justify-between items-end border-b border-gray-100 dark:border-white/5">
                  <div className="space-y-0.5"><div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">현재 잔액</div><div className="text-xl font-black dark:text-white">{formatCurrency(selectedAccountForDetail.balance)}</div></div>
                  <div className="text-right"><div className="text-[10px] text-gray-400 font-bold uppercase">전체 {filteredAccountHistory.length}건</div></div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-0.5 no-scrollbar bg-white dark:bg-[#121212] divide-y divide-gray-100 dark:divide-white/5">
                  {filteredAccountHistory.map((t) => (
                    <TransactionCard 
                        key={t.uniqueId} 
                        t={t} 
                        noBg 
                        contextAccount={selectedAccountForDetail.name} 
                        runningBalance={accountRunningBalances[t.uniqueId]} 
                    />
                  ))}
              </div>
          </BottomSheetWrapper>
      )}

      {selectedFlowDate && (
          <BottomSheetWrapper onClose={() => setSelectedFlowDate(null)} title={selectedFlowDate} subtitle="날짜별 상세" headerColorClass="bg-zinc-900" noDim hideClose>
              <div className="bg-zinc-800/20 dark:bg-white/5 px-6 py-4 flex justify-between items-end border-b border-gray-100 dark:border-white/5">
                  <div className="bg-green-500/10 p-2 rounded-xl border border-green-500/20 text-center flex-1 mr-1.5">
                      <div className="text-[9px] text-green-600 dark:text-green-500 font-bold uppercase">수입 합계</div>
                      <div className="text-base font-black text-green-600 dark:text-green-500">{formatCurrency(selectedFlowEntry?.income || 0)}</div>
                  </div>
                  <div className="bg-red-500/10 p-2 rounded-xl border border-red-500/20 text-center flex-1 ml-1.5">
                      <div className="text-[9px] text-red-500 dark:text-red-400 font-bold uppercase">지출 합계</div>
                      <div className="text-base font-black text-red-600 dark:text-red-400">{formatCurrency(selectedFlowEntry?.expense || 0)}</div>
                  </div>
              </div>
              <div className="p-4 space-y-0.5 overflow-y-auto no-scrollbar flex-1 bg-white dark:bg-[#121212] divide-y divide-gray-100 dark:divide-white/5">
                  {filteredTxns.filter(t => (period === 'year' || period === 'quarter' || (period === 'custom' && flowData.length > 62)) ? t.date.startsWith(selectedFlowDate.replace('월','').padStart(2,'0')) : t.date === (selectedFlowDate.includes('일') ? startDate.toISOString().split('T')[0].slice(0, 8) + selectedFlowDate.replace('일','').padStart(2,'0') : selectedFlowDate)).map((t) => <TransactionCard key={t.uniqueId} t={t} noBg />)}
              </div>
          </BottomSheetWrapper>
      )}

      {selectedAvgDetail && (
          <BottomSheetWrapper onClose={() => setSelectedAvgDetail(null)} title={selectedAvgDetail.subcategory || selectedAvgDetail.account || ''} subtitle="평균 데이터 분석" headerColorClass="bg-zinc-900" noDim hideClose>
              <div className="bg-zinc-800/20 dark:bg-white/5 px-6 py-4 border-b border-gray-100 dark:border-white/5">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-end min-h-[64px]">
                          <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">월 평균 지출/출금</div>
                          <div className="text-sm text-red-500 font-black">{formatCurrency(selectedAvgDetail.avgExpense)}</div>
                      </div>
                      <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-end min-h-[64px]">
                          <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">누적 총 수입/입금</div>
                          <div className="text-sm dark:text-white font-black">{formatCurrency(selectedAvgDetail.totalIncome)}</div>
                      </div>
                  </div>
                  <div className="pt-3 flex justify-between items-center px-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">분석 기간: {selectedAvgDetail.monthCount}개월</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">누적 {selectedAvgDetail.count}건 거래</span>
                  </div>
              </div>
              <div className="p-4 space-y-0.5 overflow-y-auto no-scrollbar flex-1 bg-white dark:bg-[#121212] divide-y divide-gray-100 dark:divide-white/5">
                  {transactions.filter(t => (selectedAvgDetail.subcategory ? t.subcategory === selectedAvgDetail.subcategory : t.account === selectedAvgDetail.account)).slice(0, 50).map((t) => <TransactionCard key={t.uniqueId} t={t} noBg />)}
              </div>
          </BottomSheetWrapper>
      )}

      {selectedCategoryDetail && (
          <BottomSheetWrapper onClose={() => setSelectedCategoryDetail(null)} title={selectedCategoryDetail.name} subtitle={`${label} 상세 분석`} headerColorClass="bg-zinc-900" noDim hideClose>
              <div className="bg-zinc-800/20 dark:bg-white/5 px-6 py-4 flex justify-between items-end border-b border-gray-100 dark:border-white/5">
                   <div className="space-y-0.5">
                       <div className="text-[10px] text-gray-500 font-bold uppercase">선택 기간 합계</div>
                       <div className={`text-xl font-black ${analysisTab === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                           {formatCurrency(currentCategoryDetailSum)}
                       </div>
                   </div>
                   <div className="text-right">
                       <div className="text-[10px] text-gray-500 font-bold uppercase">점유 비중</div>
                       <div className="text-lg font-black dark:text-white leading-none">{currentCategoryDetailPercentage.toFixed(1)}%</div>
                   </div>
              </div>
              <div className="p-4 space-y-0.5 overflow-y-auto no-scrollbar flex-1 bg-white dark:bg-[#121212] divide-y divide-gray-100 dark:divide-white/5">
                  {currentCategoryDetailItems.map((t) => <TransactionCard key={t.uniqueId} t={t} noBg />)}
              </div>
          </BottomSheetWrapper>
      )}

      {/* Centered Modals */}
      {isManagingAccounts && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setIsManagingAccounts(false)}>
              <div className="bg-white dark:bg-[#121212] w-full max-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold dark:text-white">대시보드 노출 계좌</h3></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                      {allAccounts.map(acc => (
                          <label key={acc} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 cursor-pointer active:scale-[0.98] transition-all">
                              <span className="text-sm dark:text-gray-200 font-medium">{acc}</span>
                              <input type="checkbox" checked={tempManagedAccounts.has(acc)} onChange={() => { const next = new Set(tempManagedAccounts); if (next.has(acc)) next.delete(acc); else next.add(acc); setTempManagedAccounts(next); }} className="w-5 h-5 rounded-full" />
                          </label>
                      ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0"><button onClick={handleSaveManagedAccounts} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">저장</button></div>
              </div>
          </div>
      )}

      {isEditingCategoryVisibility && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setIsEditingCategoryVisibility(false)}>
              <div className="bg-white dark:bg-[#121212] w-full max-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold dark:text-white">카테고리 표시 관리</h3></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                      {categoryBudgetStatsRaw.map(s => (
                          <label key={s.subcategory} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 cursor-pointer active:scale-[0.98] transition-all">
                              <span className="text-sm dark:text-gray-200 font-medium">{s.subcategory}</span>
                              <input type="checkbox" checked={!hiddenCategoryNames.has(s.subcategory || '')} onChange={() => { const next = new Set(hiddenCategoryNames); if (next.has(s.subcategory || '')) next.delete(s.subcategory || ''); else next.add(s.subcategory || ''); setHiddenCategoryNames(next); }} className="w-5 h-5 rounded-full" />
                          </label>
                      ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0"><button onClick={() => handleSaveVisibility('category')} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">완료</button></div>
              </div>
          </div>
      )}

      {isEditingAccountVisibility && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setIsEditingAccountVisibility(false)}>
              <div className="bg-white dark:bg-[#121212] w-full max-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold dark:text-white">통장 표시 관리</h3></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                      {accountBudgetStatsRaw.map(s => (
                          <label key={s.account} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 cursor-pointer active:scale-[0.98] transition-all">
                              <span className="text-sm dark:text-gray-200 font-medium">{s.account}</span>
                              <input type="checkbox" checked={!hiddenAccountNames.has(s.account || '')} onChange={() => { const next = new Set(hiddenAccountNames); if (next.has(s.account || '')) next.delete(s.account || ''); else next.add(s.account || ''); setHiddenAccountNames(next); }} className="w-5 h-5 rounded-full" />
                          </label>
                      ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0"><button onClick={() => handleSaveVisibility('account')} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">완료</button></div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;

```


---

## HTML (history.tsx)
```html
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction } from '../types';
import { deleteTransaction, updateTransaction, uploadImageToDrive } from '../services/googleSheetsService';
import { CATEGORIES, SETTLEMENT_OPTS, HORSE_ACCOUNTS } from '../constants';
import { useUI } from '../contexts/UIContext';
import { formatCurrency, sortTransactionsChronologically, generateUniqueId } from '../utils/analysisUtils';

interface HistoryProps {
  transactions: Transaction[];
  refreshData: () => void;
  subcategories: string[];
  accounts: string[];
  incomeSources: string[];
}

// --- Icons ---
const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ChevronLeft = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRight = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const History: React.FC<HistoryProps> = ({ transactions: propTransactions, refreshData, subcategories, accounts, incomeSources }) => {
  const { showSnackbar, showConfirm } = useUI();

  // --- States ---
  const [viewMode, setViewMode] = useState<'calendar' | 'custom'>('calendar');
  const [anchorDate, setAnchorDate] = useState(new Date()); 
  const [selectedDay, setSelectedDay] = useState<string | null>(null); 
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  
  // Custom range states
  const [customStart, setCustomStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSettlement, setFilterSettlement] = useState('all');
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [editCostDisplay, setEditCostDisplay] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // --- Helpers ---
  const toYMD = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
  };

  const truncate = (text: string, max: number = 20) => {
      if (!text) return '';
      return text.length > max ? text.slice(0, max) + '...' : text;
  };

  // --- Calendar Logic ---
  const { calendarDays, currentWeekRange } = useMemo(() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay(); 
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i));
    }

    // Determine visible week based on anchorDate
    const targetDateStr = toYMD(anchorDate);
    let targetIndex = days.findIndex(d => d && toYMD(d) === targetDateStr);
    
    if (targetIndex === -1) targetIndex = days.length - 1;
    
    const rowStart = Math.floor(targetIndex / 7) * 7;
    const week = days.slice(rowStart, rowStart + 7);
    
    const weekRange = {
        start: week.find(d => d !== null) || new Date(),
        end: [...week].reverse().find(d => d !== null) || new Date()
    };

    return { 
        calendarDays: isCalendarExpanded ? days : week,
        currentWeekRange: weekRange
    };
  }, [anchorDate, isCalendarExpanded]);

  const dailyStats = useMemo(() => {
    const stats: Record<string, { income: number; expense: number }> = {};
    propTransactions.forEach(t => {
        if (!stats[t.date]) stats[t.date] = { income: 0, expense: 0 };
        if (t.cost > 0 && !t.category.includes('이동')) stats[t.date].income += t.cost;
        else if (t.cost < 0 && !t.category.includes('이동')) stats[t.date].expense += Math.abs(t.cost);
    });
    return stats;
  }, [propTransactions]);

  // --- Filtering Logic (Strictly within current period) ---
  const filteredData = useMemo(() => {
    const targetYM = `${anchorDate.getFullYear()}-${String(anchorDate.getMonth() + 1).padStart(2, '0')}`;
    const weekStartStr = toYMD(currentWeekRange.start);
    const weekEndStr = toYMD(currentWeekRange.end);

    return propTransactions
      .filter(t => {
        let isInPeriod = false;

        // 1. Date Period Logic
        if (viewMode === 'custom') {
            isInPeriod = (t.date >= customStart && t.date <= customEnd);
        } else {
            if (selectedDay) {
                isInPeriod = (t.date === selectedDay);
            } else if (isCalendarExpanded) {
                // 월간 모드 리스트
                isInPeriod = t.date.startsWith(targetYM);
            } else {
                // 주간 모드 리스트
                isInPeriod = (t.date >= weekStartStr && t.date <= weekEndStr);
            }
        }

        if (!isInPeriod) return false;

        // 2. Search Keyword Filter (Within period)
        if (search) {
          const target = `
            ${t.note || ''}
            ${t.account || ''}
            ${t.subcategory || ''}
            ${t.category || ''}
            ${t.cost || ''}
            ${t.incomeSource || ''}
            ${t.settlement || ''}
            ${t.settlementFromAccount || ''}
            ${t.settlementToAccount || ''}
          `.toLowerCase();
          const keywords = search.split(',').map(k => k.trim().toLowerCase()).filter(k => k !== '');
          if (keywords.length > 0 && !keywords.some(kw => target.includes(kw))) return false;
        }

        // 3. Category & Settlement Filters
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;
        if (filterSettlement !== 'all' && t.settlement !== filterSettlement) return false;

        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.inputTime.localeCompare(a.inputTime) || b.uniqueId.localeCompare(a.uniqueId));
  }, [propTransactions, anchorDate, selectedDay, isCalendarExpanded, viewMode, customStart, customEnd, filterCategory, filterSettlement, search, currentWeekRange]);

  const runningBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    const idToBalance: Record<string, number> = {};
    const chronological = sortTransactionsChronologically(propTransactions);

    chronological.forEach(t => {
        const abs = Math.abs(t.cost);
        balances[t.account] = (balances[t.account] || 0) + t.cost;
        if (t.settlementFromAccount && !HORSE_ACCOUNTS.includes(t.settlementFromAccount)) balances[t.settlementFromAccount] = (balances[t.settlementFromAccount] || 0) - abs;
        if (t.settlementToAccount && !HORSE_ACCOUNTS.includes(t.settlementToAccount)) balances[t.settlementToAccount] = (balances[t.settlementToAccount] || 0) + abs;
        idToBalance[t.uniqueId] = balances[t.account];
    });
    return idToBalance;
  }, [propTransactions]);

  // --- Selection Stats Logic ---
  const selectedStats = useMemo(() => {
      let income = 0;
      let expense = 0;
      propTransactions.forEach(t => {
          if (selectedIds.has(t.uniqueId)) {
              if (t.cost > 0 && !t.category.includes('이동')) income += t.cost;
              else if (t.cost < 0 && !t.category.includes('이동')) expense += Math.abs(t.cost);
          }
      });
      return { income, expense, balance: income - expense };
  }, [selectedIds, propTransactions]);

  // --- Handlers ---
  const handleNavigate = (direction: 'prev' | 'next') => {
    const next = new Date(anchorDate);
    const offset = direction === 'prev' ? -1 : 1;

    if (isCalendarExpanded) {
        // 월간 모드: 1개월씩 이동
        next.setMonth(next.getMonth() + offset);
    } else {
        // 주간 모드: 7일씩 이동
        next.setDate(next.getDate() + (offset * 7));
    }

    setAnchorDate(next);
    setSelectedDay(null);
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredData.length && filteredData.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredData.map(t => t.uniqueId)));
      }
  };

  const handleEditCostChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    const num = cleaned ? parseInt(cleaned, 10) : 0;
    setEditCostDisplay(num.toLocaleString());
  };

  const toggleSign = () => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, cost: -editingItem.cost });
  };

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;
    setIsUploading(true);
    showSnackbar('사진 업로드 중...', 'info');
    try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        const base64Data = await base64Promise;
        const driveUrl = await uploadImageToDrive(base64Data);
        if (driveUrl) {
            setEditingItem({ ...editingItem, imageUrl: driveUrl });
            showSnackbar('업로드 완료!', 'success');
        }
    } catch (err) {
        showSnackbar('업로드 실패', 'error');
    } finally { setIsUploading(false); }
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (editingItem) setEditingItem({ ...editingItem, imageUrl: '' });
  };

  const openImageUrl = (e: React.MouseEvent, url: string | undefined) => {
    e.stopPropagation();
    if (url) window.open(url, '_blank');
  };

  const handleUpdate = async () => {
    if (!editingItem || !editingItem.rowIndex) return;
    let costAmount = parseInt(editCostDisplay.replace(/,/g, ''), 10) || 0;
    let finalCost = editingItem.cost < 0 ? -Math.abs(costAmount) : Math.abs(costAmount);
    try {
        await updateTransaction(editingItem.rowIndex, { ...editingItem, cost: finalCost });
        showSnackbar('수정되었습니다.', 'success');
        setEditingItem(null);
        refreshData();
    } catch(e) { showSnackbar('수정 실패.', 'error'); }
  };

  const handleDelete = async (id: string, note: string) => {
    showConfirm(`'${note || "선택한 내역"}'을 삭제하시겠습니까?`, async () => {
        try {
            await deleteTransaction(id);
            showSnackbar('삭제되었습니다.', 'success');
            setEditingItem(null);
            refreshData();
        } catch(e) { showSnackbar('삭제 실패.', 'error'); }
    });
  };

  useEffect(() => {
    if (editingItem) setEditCostDisplay(Math.abs(editingItem.cost).toLocaleString());
  }, [editingItem?.uniqueId]);

  return (
    <div className="pb-24 animate-fade-in min-h-screen relative max-w-md mx-auto">
      
      {/* 1. Navigation Header */}
      <div className="sticky top-0 z-40 bg-gray-50/95 dark:bg-[#000000] backdrop-blur-md -mx-5 px-5 border-b border-gray-200 dark:border-white/10 shadow-sm pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
            <div className="flex bg-gray-200 dark:bg-white/10 p-1 rounded-xl">
                <button onClick={() => setViewMode('calendar')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>캘린더</button>
                <button onClick={() => setViewMode('custom')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'custom' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>기간지정</button>
            </div>
            <div className="text-right">
                <h2 className="text-sm font-black dark:text-white">{anchorDate.getFullYear()}년 {anchorDate.getMonth() + 1}월</h2>
            </div>
        </div>
      </div>

      {/* 2. Calendar Selection View */}
      {viewMode === 'calendar' ? (
          <div className="p-2 mb-2 mx-1 transition-all animate-fade-in">
            <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={() => handleNavigate('prev')} className="p-1 text-gray-400 hover:text-blue-500 transition-colors"><ChevronLeft /></button>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isCalendarExpanded ? '월간 모드' : '주간 모드'}</span>
                <button onClick={() => handleNavigate('next')} className="p-1 text-gray-400 hover:text-blue-500 transition-colors"><ChevronRight /></button>
            </div>
            <div className="grid grid-cols-7 mb-4">
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                    <div key={d} className={`text-center text-[11px] font-black ${i === 0 ? 'text-red-400/80' : i === 6 ? 'text-blue-400/80' : 'text-gray-400'}`}>{d}</div>
                ))}
            </div>
            <div className={`grid grid-cols-7 gap-y-5 transition-all`}>
                {calendarDays.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} />;
                    const dateStr = toYMD(date);
                    const stats = dailyStats[dateStr];
                    const isSelected = selectedDay === dateStr;
                    const isToday = toYMD(new Date()) === dateStr;
                    const dayOfWeek = date.getDay();

                    return (
                        <button key={dateStr} onClick={() => setSelectedDay(isSelected ? null : dateStr)} className={`flex flex-col items-center justify-start min-h-[54px] relative group ${isSelected ? 'scale-110 z-10' : 'hover:opacity-70'}`}>
                            <span className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-full mb-1 transition-all ${
                                isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 
                                isToday ? 'border-2 border-blue-500 text-blue-500' : 
                                dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'dark:text-gray-300'
                            }`}>
                                {date.getDate()}
                            </span>
                            {stats && (
                                <div className="flex flex-col items-center gap-[1px] w-full px-0.5">
                                    {stats.income > 0 && <div className="text-[7px] font-black text-blue-500 leading-none">+{stats.income >= 10000 ? (stats.income/10000).toFixed(1)+'만' : stats.income.toLocaleString()}</div>}
                                    {stats.expense > 0 && <div className="text-[7px] font-black text-red-500 leading-none">-{stats.expense >= 10000 ? (stats.expense/10000).toFixed(1)+'만' : stats.expense.toLocaleString()}</div>}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
          </div>
      ) : (
          <div className="p-4 mx-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl mb-4 animate-fade-in space-y-3 shadow-sm">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">조회 기간 설정</div>
              <div className="flex items-center gap-3">
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="flex-1 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl h-12 px-4 text-xs font-bold dark:text-white outline-none focus:ring-2 ring-blue-500/20" />
                  <span className="text-gray-400 font-bold">~</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="flex-1 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl h-12 px-4 text-xs font-bold dark:text-white outline-none focus:ring-2 ring-blue-500/20" />
              </div>
          </div>
      )}

      {/* 3. Filter & Search Bar */}
      <div className="relative my-4 px-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="키워드 검색 (선택 기간 내)" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm dark:text-white focus:outline-none focus:ring-2 ring-blue-500/20 transition-all h-12 shadow-sm font-medium" />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 p-1">✕</button>}
      </div>

      <div className={`grid ${isSelectMode ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 px-1 mb-6 transition-all`}>
          <button onClick={() => { setIsSelectMode(!isSelectMode); if(isSelectMode) setSelectedIds(new Set()); }} className={`h-11 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center shadow-sm ${isSelectMode ? 'bg-red-500 border-red-500 text-white' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500'}`}>
              {isSelectMode ? '취소' : '다중 선택'}
          </button>
          {isSelectMode && (
              <button onClick={toggleSelectAll} className="h-11 rounded-xl text-[10px] font-bold border bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 flex items-center justify-center shadow-sm">
                  {selectedIds.size === filteredData.length && filteredData.length > 0 ? '전체 해제' : '전체 선택'}
              </button>
          )}
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full h-11 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-2 text-[10px] font-bold dark:text-white outline-none appearance-none shadow-sm cursor-pointer">
              <option value="all">모든 분류 ▾</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterSettlement} onChange={e => setFilterSettlement(e.target.value)} className="w-full h-11 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-2 text-[10px] font-bold dark:text-white outline-none appearance-none shadow-sm cursor-pointer">
              <option value="all">모든 정산 ▾</option>
              {SETTLEMENT_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
      </div>

      {/* --- Selection Summary Bar (RESTORING) --- */}
      {isSelectMode && selectedIds.size > 0 && (
          <div className="sticky top-[108px] z-30 mx-1 mb-4 bg-blue-600 dark:bg-blue-700 text-white rounded-2xl p-4 shadow-lg shadow-blue-500/30 animate-scale-in">
              <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{selectedIds.size}건 선택됨</span>
                  <button onClick={() => setSelectedIds(new Set())} className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-lg">초기화</button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                      <div className="text-[9px] opacity-70 mb-0.5">선택 수입</div>
                      <div className="text-sm font-black">{formatCurrency(selectedStats.income)}</div>
                  </div>
                  <div>
                      <div className="text-[9px] opacity-70 mb-0.5">선택 지출</div>
                      <div className="text-sm font-black">{formatCurrency(selectedStats.expense)}</div>
                  </div>
                  <div>
                      <div className="text-[9px] opacity-70 mb-0.5">합계 잔액</div>
                      <div className="text-sm font-black">{formatCurrency(selectedStats.balance)}</div>
                  </div>
              </div>
          </div>
      )}

      {/* 4. List View */}
      <div className="mt-2 divide-y divide-gray-100 dark:divide-white/5 px-1">
        {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500 opacity-60">
                <p className="text-sm font-medium">선택된 기간에 내역이 없습니다.</p>
            </div>
        ) : (
            <>
                {filteredData.map((t) => (
                    <div key={t.uniqueId} onClick={() => isSelectMode ? toggleSelection(t.uniqueId) : setEditingItem(t)} className={`flex items-center justify-between py-4 px-1 transition-colors cursor-pointer active:bg-gray-50 dark:active:bg-white/5 ${selectedIds.has(t.uniqueId) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                            {isSelectMode && <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${selectedIds.has(t.uniqueId) ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}>{selectedIds.has(t.uniqueId) && <span className="text-white text-[10px]">✓</span>}</div>}
                            <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-lg shrink-0 border border-gray-200 dark:border-white/5">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{t.date.slice(5, 7)}</span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">{t.date.slice(8, 10)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1 min-w-0">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                                        t.settlement.includes('완료') ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' :
                                        t.settlement.includes('대기') ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' :
                                        'bg-gray-500/10 border-gray-500/20 text-gray-500 dark:text-gray-400'
                                    }`}>{t.settlement.split(' ').pop()}</span>
                                    <div className="font-bold text-gray-900 dark:text-white text-[14px] truncate">{truncate(t.note || t.subcategory)}</div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                                        t.category.includes('지출') ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' :
                                        t.category.includes('수입') ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' :
                                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}>{t.category.replace(/[^\w가-힣]/g, '')}</span>
                                    <span className="font-medium shrink-0">{t.account}</span>
                                    {t.incomeSource && <><span className="opacity-30 shrink-0">•</span><span className="text-blue-500 font-bold shrink-0">{t.incomeSource}</span></>}
                                    <span className="opacity-30 shrink-0">•</span>
                                    <span className="truncate">{t.subcategory}</span>
                                    {t.imageUrl && <span className="text-[10px] shrink-0">🧾</span>}
                                </div>
                            </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                            <div className={`font-black text-[14px] ${t.cost > 0 ? 'text-blue-500' : t.cost < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                {t.cost > 0 ? '+' : ''}{t.cost.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 font-bold">
                                {runningBalances[t.uniqueId]?.toLocaleString() || '0'}원
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* 7일 보기일 때만 월간 더보기 노출 */}
                {viewMode === 'calendar' && !isCalendarExpanded && filteredData.length > 0 && !search && !selectedDay && (
                    <div className="py-10 text-center">
                        <button onClick={() => { setIsCalendarExpanded(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-8 py-3.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full text-xs font-black text-gray-500 hover:text-blue-500 transition-all active:scale-95 shadow-sm">
                            이전 내역 더보기
                        </button>
                    </div>
                )}
            </>
        )}
      </div>

      {/* 5. Edit Modal (Strictly Preserved) */}
      {editingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-sm rounded-[2.5rem] p-7 shadow-2xl border border-gray-200 dark:border-white/10 my-auto max-h-[92vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-7">
                    <h3 className="text-lg font-black dark:text-white flex items-center gap-2">상세 내역 수정</h3>
                    <button onClick={() => setEditingItem(null)} className="text-gray-400 p-2 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-full transition-colors"><XIcon /></button>
                </div>
                
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3.5">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">기본 분류</label>
                            <select value={editingItem.category} onChange={(e) => setEditingItem({...editingItem, category: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none border border-transparent focus:border-blue-500/50">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">정산 상태</label>
                            <select value={editingItem.settlement} onChange={(e) => setEditingItem({...editingItem, settlement: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none border border-transparent focus:border-blue-500/50">
                                {SETTLEMENT_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    </div>

                    {editingItem.category === '💰수입' && (
                        <div className="animate-fade-in">
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">수입처</label>
                            <select value={editingItem.incomeSource || ''} onChange={(e) => setEditingItem({...editingItem, incomeSource: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none border border-transparent focus:border-blue-500/50">
                                <option value="">(미선택)</option>
                                {incomeSources.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">내용 (메모)</label>
                        <input value={editingItem.note} onChange={(e) => setEditingItem({...editingItem, note: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none border border-transparent focus:border-blue-500/50" />
                    </div>

                    <div>
                        <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">금액</label>
                        <div className="flex gap-2.5">
                             <button onClick={toggleSign} className={`w-12 h-12 rounded-xl border flex items-center justify-center font-black transition-all active:scale-90 shrink-0 ${editingItem.cost < 0 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-blue-500/10 border-blue-500/30 text-blue-500'}`}>+/-</button>
                             <div className="relative flex-1">
                                <input type="text" inputMode="numeric" value={editCostDisplay} onChange={(e) => handleEditCostChange(e.target.value)} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-2xl font-black dark:text-white outline-none text-right pr-4 focus:ring-2 ring-blue-500/20" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                    <span className={`font-black text-xl ${editingItem.cost < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                        {editingItem.cost < 0 ? '−' : editingItem.cost > 0 ? '+' : ''}
                                    </span>
                                    <span className="text-gray-400 font-bold">₩</span>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                         <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">날짜</label>
                            <input value={editingItem.date} type="date" onChange={(e) => setEditingItem({...editingItem, date: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none appearance-none" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">상세 항목</label>
                            <select value={editingItem.subcategory} onChange={(e) => setEditingItem({...editingItem, subcategory: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none">
                                {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                        <div className="col-span-2">
                             <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">결제 수단 / 통장</label>
                             <select value={editingItem.account} onChange={(e) => setEditingItem({...editingItem, account: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none">
                                {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">정산 출금 통장</label>
                            <select value={editingItem.settlementFromAccount || ''} onChange={(e) => setEditingItem({...editingItem, settlementFromAccount: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none">
                                <option value="">(미선택)</option>
                                {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase tracking-tight">정산 입금 통장</label>
                            <select value={editingItem.settlementToAccount || ''} onChange={(e) => setEditingItem({...editingItem, settlementToAccount: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 rounded-xl px-4 h-12 text-sm dark:text-white outline-none">
                                <option value="">(미선택)</option>
                                {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="text-[10px] text-gray-500 font-bold ml-1 mb-2 block uppercase tracking-tight">영수증 / 증빙 자료</label>
                        {editingItem.imageUrl ? (
                            <div className="space-y-2.5 animate-fade-in">
                                <div className="flex gap-2.5">
                                    <button onClick={(e) => openImageUrl(e, editingItem.imageUrl)} className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all">🖼️ 원본 확인</button>
                                    <button onClick={handleRemoveImage} className="w-14 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20 active:scale-95 transition-all shadow-sm" title="이미지 삭제"><XIcon /></button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <input type="file" accept="image/*" onChange={handleEditImageChange} className="hidden" id="edit-receipt-upload" disabled={isUploading} />
                                <label htmlFor="edit-receipt-upload" className={`w-full h-14 flex items-center justify-center rounded-2xl border-2 border-dashed transition-all active:scale-[0.98] cursor-pointer ${isUploading ? 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 opacity-60' : 'border-gray-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50'}`}>
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-tight">
                                        {isUploading ? '⏳ 이미지 업로드 중...' : '📸 영수증 사진 업로드'}
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex gap-3.5 mt-10">
                    <button onClick={() => handleDelete(editingItem.uniqueId, editingItem.note)} className="flex-1 py-4 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl font-black text-sm active:scale-95 transition-transform shadow-sm">삭제</button>
                    <button onClick={handleUpdate} className="flex-[2.5] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/30 active:scale-95 transition-transform">저장</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default History;
```


---

## HTML (input.tsx)
```html

import React, { useState, useEffect, useMemo } from 'react';
import { CATEGORIES, SETTLEMENT_OPTS } from '../constants';
import { generateUniqueId, formatCurrency, isSameDate } from '../utils/analysisUtils';
import { addTransaction, addTransfer, updateSubcategories, updateAccounts, updateIncomeSources } from '../services/googleSheetsService';
import { useUI } from '../contexts/UIContext';
import { DashboardData } from '../types';

interface InputProps {
  subcategories: string[];
  accounts: string[];
  incomeSources: string[]; // 수입처 리스트 추가
  refreshData: () => void;
  dashboardData: DashboardData | null;
}

type ViewMode = 'week' | 'month' | 'year';

const SHORTCUTS = [
    { val: 1000, label: '+1천' },
    { val: 5000, label: '+5천' },
    { val: 10000, label: '+1만' },
    { val: 50000, label: '+5만' },
];

// --- Icons ---
const EditIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const Input: React.FC<InputProps> = ({ subcategories, accounts, incomeSources, refreshData, dashboardData }) => {
  const { showSnackbar, showConfirm } = useUI();
  
  // Date State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // Input State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [incomeSource, setIncomeSource] = useState(''); // 수입처 상태
  const [note, setNote] = useState('');
  const [account, setAccount] = useState(''); // Default account
  const [fromAccount, setFromAccount] = useState(''); // Transfer source
  const [toAccount, setToAccount] = useState('');     // Transfer destination
  const [cost, setCost] = useState('');
  const [settlement, setSettlement] = useState(SETTLEMENT_OPTS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal State for Management
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageType, setManageType] = useState<'subcategory' | 'account' | 'incomeSource'>('subcategory');
  const [manageList, setManageList] = useState<string[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isSavingList, setIsSavingList] = useState(false);
  
  // Inline Editing State within Modal
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (subcategories.length > 0 && !subcategory) setSubcategory(subcategories[0]);
    if (incomeSources.length > 0 && !incomeSource) setIncomeSource(incomeSources[0]);
    if (accounts.length > 0) {
        if (!account) setAccount(accounts[0]);
        if (!fromAccount) setFromAccount(accounts[0]);
        if (!toAccount) setToAccount(accounts.length > 1 ? accounts[1] : accounts[0]);
    }
  }, [subcategories, accounts, incomeSources]);

  // Current balance for the selected account
  const currentAppBalance = useMemo(() => {
      if (!dashboardData || !account) return 0;
      const bank = dashboardData.bankBalances.find(b => b.name === account);
      return bank ? bank.balance : 0;
  }, [dashboardData, account]);

  // Calculated adjustment amount if in balance adjustment mode
  const balanceAdjustmentDelta = useMemo(() => {
      if (category !== '⚖️잔액조정') return 0;
      const inputVal = parseInt(cost.replace(/,/g, '') || '0', 10);
      return inputVal - currentAppBalance;
  }, [category, cost, currentAppBalance]);

  // --- Management Logic ---

  const handleOpenManage = (type: 'subcategory' | 'account' | 'incomeSource') => {
      setManageType(type);
      setManageList(type === 'subcategory' ? [...subcategories] : type === 'account' ? [...accounts] : [...incomeSources]);
      setNewItemName('');
      setEditingIdx(null);
      setRenameMap({});
      setIsManageModalOpen(true);
  };

  const handleAddItem = () => {
      if (!newItemName.trim()) return;
      if (manageList.includes(newItemName.trim())) {
          showSnackbar('이미 존재하는 항목입니다.', 'error');
          return;
      }
      setManageList([...manageList, newItemName.trim()]);
      setNewItemName('');
  };

  const handleStartEdit = (idx: number) => {
      setEditingIdx(idx);
      setEditingValue(manageList[idx]);
  };

  const handleSaveEdit = () => {
      if (editingIdx === null || !editingValue.trim()) return;
      const oldName = manageList[editingIdx];
      const newName = editingValue.trim();
      
      if (oldName === newName) {
          setEditingIdx(null);
          return;
      }

      const nextList = [...manageList];
      nextList[editingIdx] = newName;
      setManageList(nextList);
      setRenameMap(prev => ({ ...prev, [oldName]: newName }));
      setEditingIdx(null);
  };

  const handleRemoveItem = (index: number) => {
      const item = manageList[index];
      showConfirm(`'${item}' 항목을 삭제하시겠습니까?`, () => {
          const next = manageList.filter((_, i) => i !== index);
          setManageList(next);
          if (editingIdx === index) setEditingIdx(null);
      });
  };

  const handleSaveList = async () => {
      setIsSavingList(true);
      try {
          if (manageType === 'subcategory') {
              await updateSubcategories(manageList, renameMap);
          } else if (manageType === 'account') {
              await updateAccounts(manageList, renameMap);
          } else {
              await updateIncomeSources(manageList, renameMap);
          }
          showSnackbar('리스트가 성공적으로 업데이트되었습니다.', 'success');
          refreshData();
          setIsManageModalOpen(false);
      } catch (e: any) {
          showSnackbar(e.message, 'error');
      } finally {
          setIsSavingList(false);
      }
  };

  // --- Logic for Views ---
  const weekDays = useMemo(() => {
    const current = new Date(viewDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date(current).setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  }, [viewDate]);

  const monthDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; 
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [viewDate]);

  // --- Navigation Handlers ---
  const handlePrev = () => {
    const newDate = new Date(viewDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setFullYear(newDate.getFullYear() - 1);
    setViewDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(viewDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else newDate.setFullYear(newDate.getFullYear() + 1);
    setViewDate(newDate);
  };

  const toggleViewMode = () => {
    if (viewMode === 'week') setViewMode('month');
    else if (viewMode === 'month') setViewMode('year');
    else setViewMode('week');
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setViewDate(date);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(monthIndex);
    newDate.setDate(1);
    setViewDate(newDate);
    setViewMode('month');
  };

  const formatDateForApi = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
  };

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const displayDayNames = ['월', '화', '수', '목', '금', '토', '일'];

  const handleAmountBtn = (amount: number) => {
    const current = parseInt(cost.replace(/,/g, '') || '0', 10);
    setCost((current + amount).toLocaleString());
  };

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    const costNum = parseInt(cost.replace(/,/g, ''), 10);
    if (category !== '⚖️잔액조정' && !costNum) {
        showSnackbar('금액을 입력해주세요.', 'error');
        return;
    }

    if (category !== '➡️이동' && (!account || (category !== '⚖️잔액조정' && !subcategory))) {
      showSnackbar('필수 항목을 모두 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = formatDateForApi(selectedDate);

      if (category === '➡️이동') {
          if (fromAccount === toAccount) {
              showSnackbar('출금 통장과 입금 통장이 같습니다.', 'error');
              setIsSubmitting(false);
              return;
          }
          await addTransfer(costNum, fromAccount, toAccount, dateStr, note, settlement);
      } else {
          let finalCost = costNum;
          let finalSubcategory = subcategory;
          let finalNote = note;

          if (category === '🚨지출') {
              finalCost = -Math.abs(finalCost);
          } else if (category === '💰수입') {
              finalCost = Math.abs(finalCost);
          } else if (category === '⚖️잔액조정') {
              finalCost = balanceAdjustmentDelta;
              finalSubcategory = '잔액조정';
              if (!finalNote) finalNote = `잔액 맞춤 (${formatCurrency(costNum)}으로 리셋)`;
          }

          const newTxn = {
            uniqueId: generateUniqueId(),
            inputTime: new Date().toISOString(),
            category,
            subcategory: finalSubcategory,
            note: finalNote,
            account,
            cost: finalCost,
            date: dateStr,
            settlement,
            imageUrl: previewImage || '',
            incomeSource: category === '💰수입' ? incomeSource : '' // 수입처 저장
          };
          await addTransaction(newTxn);
      }

      showSnackbar('저장되었습니다!', 'success');
      setCost('');
      setNote('');
      setPreviewImage(null);
      refreshData();
    } catch (e) {
      console.error(e);
      showSnackbar('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHeaderTitle = () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth() + 1;
    return viewMode === 'year' ? `${y}년` : `${y}년 ${m}월`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Date Selection UI */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">날짜 선택</label>
        <div className="bg-white dark:bg-[#121212] rounded-2xl p-4 border border-gray-200 dark:border-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <button onClick={handlePrev} className="text-blue-500 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white transition-colors">
                        {getHeaderTitle()}
                    </span>
                    <button 
                        onClick={toggleViewMode}
                        className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1.5 rounded-full flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        {viewMode === 'week' ? '주간' : viewMode === 'month' ? '월간' : '연간'} ▼
                    </button>
                </div>
                <button onClick={handleNext} className="text-blue-500 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>

            {viewMode === 'week' && (
                <div className="grid grid-cols-7 gap-1.5">
                    {weekDays.map((d, i) => {
                        const isSelected = isSameDate(d, selectedDate);
                        return (
                            <button key={i} onClick={() => handleDateClick(d)} className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-400'}`}>
                                <span className={`text-xs mb-1 ${isSelected ? 'opacity-100' : 'opacity-60'}`}>{dayNames[d.getDay()]}</span>
                                <span className={`text-lg font-bold`}>{d.getDate()}</span>
                            </button>
                        )
                    })}
                </div>
            )}
            {viewMode === 'month' && (
                <div>
                    <div className="grid grid-cols-7 mb-2">{displayDayNames.map(day => (<div key={day} className="text-center text-xs text-gray-400 font-medium py-1">{day}</div>))}</div>
                    <div className="grid grid-cols-7 gap-1">
                        {monthDays.map((d, i) => {
                            if (!d) return <div key={`empty-${i}`} />;
                            const isSelected = isSameDate(d, selectedDate);
                            const isToday = isSameDate(d, new Date());
                            return (
                                <button key={i} onClick={() => handleDateClick(d)} className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-all ${isSelected ? 'bg-blue-600 text-white font-bold' : isToday ? 'border border-blue-500 text-blue-500 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>{d.getDate()}</button>
                            );
                        })}
                    </div>
                </div>
            )}
            {viewMode === 'year' && (
                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 12 }, (_, i) => i).map(monthIdx => {
                        const isCurrentMonth = viewDate.getMonth() === monthIdx;
                        return (
                            <button key={monthIdx} onClick={() => handleMonthSelect(monthIdx)} className={`py-4 rounded-xl text-sm font-medium transition-all ${isCurrentMonth ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 dark:bg-[#1c1c1e] text-gray-700 dark:text-gray-300'}`}>{monthIdx + 1}월</button>
                        );
                    })}
                </div>
            )}
        </div>
      </div>

      {/* Category Selection UI */}
      <div className="space-y-2">
         <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">분류</label>
         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)} className={`flex-1 min-w-[80px] py-3 rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-1 min-h-[52px] ${category === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-[#1c1c1e] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10'}`}>
                    {cat}
                </button>
            ))}
         </div>
      </div>

      <div className="space-y-4">
        {/* Cost Input */}
        <div>
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">
             {category === '⚖️잔액조정' ? '실제 통장 잔액 입력' : '금액'}
           </label>
           <div className="relative">
            <input type="text" inputMode="decimal" pattern="[0-9]*" placeholder="0" value={cost} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); setCost(val ? parseInt(val).toLocaleString() : ''); }} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-4 text-right text-2xl font-bold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-300 dark:placeholder-gray-700 pr-12" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₩</span>
            {cost && (<button onClick={() => setCost('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors text-sm font-bold">✕</button>)}
          </div>
          
          {category === '⚖️잔액조정' ? (
              <div className="mt-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 animate-fade-in">
                  <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-gray-500 dark:text-indigo-300 font-bold">앱 내 현재 잔액</span>
                      <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(currentAppBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-indigo-300 font-bold">조정 금액</span>
                      <span className={`font-black ${balanceAdjustmentDelta >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                          {balanceAdjustmentDelta >= 0 ? '+' : ''}{balanceAdjustmentDelta.toLocaleString()}원
                      </span>
                  </div>
              </div>
          ) : (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
                {SHORTCUTS.map(item => (<button key={item.label} onClick={() => handleAmountBtn(item.val)} className="flex-1 min-w-[60px] h-[48px] rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-400">{item.label}</button>))}
              </div>
          )}
        </div>

        {/* Dynamic Fields based on Category */}
        {category === '➡️이동' ? (
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">출금 통장</label>
                    <select value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                        {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">입금 통장</label>
                    <select value={toAccount} onChange={(e) => setToAccount(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                        {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>
        ) : (
            <>
                <div className="grid grid-cols-2 gap-3">
                    <div className={category === '⚖️잔액조정' ? 'opacity-40 pointer-events-none' : ''}>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">상세 분류</label>
                            <button onClick={() => handleOpenManage('subcategory')} className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                        </div>
                        <select value={category === '⚖️잔액조정' ? '잔액조정' : subcategory} onChange={(e) => setSubcategory(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                            {category === '⚖️잔액조정' ? <option>잔액조정</option> : subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">결제수단/통장</label>
                            <button onClick={() => handleOpenManage('account')} className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                        </div>
                        <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                            {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>

                {/* 수입처 필드 추가 - 오직 💰수입일 때만 노출 */}
                {category === '💰수입' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">수입처</label>
                            <button onClick={() => handleOpenManage('incomeSource')} className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                        </div>
                        <select value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                            {incomeSources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}
            </>
        )}

        {/* Note */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">내용 (선택)</label>
          <input type="text" placeholder={category === '⚖️잔액조정' ? '잔액 맞춤 사유 입력' : '내용을 입력하세요'} value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors h-[48px]" />
        </div>

        {/* Receipt / Settlement Row */}
        <div className={`grid grid-cols-2 gap-3 ${category === '⚖️잔액조정' ? 'opacity-40 pointer-events-none' : ''}`}>
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">영수증 첨부</label>
                <div className="relative">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="receipt-upload" />
                    <label htmlFor="receipt-upload" className={`w-full h-[48px] flex items-center justify-center rounded-xl border cursor-pointer transition-all ${previewImage ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400'}`}>
                        {previewImage ? '📷 변경' : '📷 사진 추가'}
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">정산상태</label>
                <select value={settlement} onChange={(e) => setSettlement(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none h-[48px]">
                    {SETTLEMENT_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>

        <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-4 mt-6 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-800 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
          {isSubmitting ? '저장 중...' : category === '⚖️잔액조정' ? '⚖️ 잔액 조정하기' : '💾 저장하기'}
        </button>
      </div>

      {/* List Management Modal */}
      {isManageModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md animate-fade-in">
              <div className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]">
                  <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                      <h3 className="text-lg font-bold dark:text-white">
                        {manageType === 'subcategory' ? '상세분류 관리' : manageType === 'account' ? '결제수단 관리' : '수입처 관리'}
                      </h3>
                      <button onClick={() => setIsManageModalOpen(false)} className="text-gray-400 p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon /></button>
                  </div>
                  
                  <div className="p-4 border-b border-gray-100 dark:border-white/5 flex gap-2 shrink-0">
                      <input 
                        type="text" 
                        value={newItemName} 
                        onChange={(e) => setNewItemName(e.target.value)} 
                        placeholder="새 항목 추가" 
                        className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 h-[48px] text-sm dark:text-white outline-none focus:border-blue-500 min-w-0" 
                      />
                      <button onClick={handleAddItem} className="bg-blue-600 text-white px-5 h-[48px] rounded-xl text-sm font-bold active:scale-95 transition-transform whitespace-nowrap shrink-0">추가</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar bg-gray-50/30 dark:bg-black/20">
                      {manageList.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 text-sm italic">등록된 항목이 없습니다.</div>
                      ) : (
                          manageList.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between px-4 py-2 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 min-h-[56px] shadow-sm">
                                  {editingIdx === idx ? (
                                      <div className="flex flex-1 items-center gap-2">
                                          <input 
                                            value={editingValue} 
                                            onChange={(e) => setEditingValue(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                            className="flex-1 h-9 bg-white dark:bg-black border border-blue-500 rounded-lg px-2 text-sm dark:text-white outline-none min-w-0"
                                            autoFocus
                                          />
                                          <button onClick={handleSaveEdit} className="text-blue-500 p-2 active:scale-90 shrink-0"><CheckIcon /></button>
                                          <button onClick={() => setEditingIdx(null)} className="text-gray-400 p-2 active:scale-90 shrink-0"><XIcon /></button>
                                      </div>
                                  ) : (
                                      <>
                                          <span className="text-sm font-medium dark:text-gray-200 truncate pr-4">{item}</span>
                                          <div className="flex items-center gap-1 shrink-0">
                                              <button onClick={() => handleStartEdit(idx)} className="text-blue-500 opacity-60 hover:opacity-100 p-2 active:scale-90"><EditIcon /></button>
                                              <button onClick={() => handleRemoveItem(idx)} className="text-red-500 opacity-60 hover:opacity-100 p-2 active:scale-90"><XIcon /></button>
                                          </div>
                                      </>
                                  )}
                              </div>
                          ))
                      )}
                  </div>

                  <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0 bg-white dark:bg-[#121212]">
                      <button onClick={handleSaveList} disabled={isSavingList} className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
                        {isSavingList ? '데이터 동기화 중...' : '저장 (구글 시트 반영)'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Input;

```


---

## HTML (Investments.tsx)
```html

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InvestmentItem, InvestmentGoal, AccountType, ProjectionConfig } from '../types';
import { INVESTMENT_CATEGORIES } from '../constants';
import { addInvestment, updateInvestment, deleteInvestment, updateInvestmentGoals, updateInvestmentAccountTypes, updateInvestmentStockCodes, updateInvestmentBrokers, updateInvestmentCategories, addInvestmentAccount, updateInvestmentAccount, deleteInvestmentAccount, fetchInvestmentAnnualReturns, saveInvestmentAnnualReturns } from '../services/googleSheetsService';
import { useUI } from '../contexts/UIContext';
import { formatCurrency, generateUniqueId } from '../utils/analysisUtils';
import { 
  TrendingUp, 
  Filter, 
  Plus, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon, 
  Calculator, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  Target,
  Search,
  X as XIcon,
  Check as CheckIcon,
  Edit as EditIcon,
  Settings as SettingsIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const ComboBox = ({ value, onChange, options, placeholder, className }: { value: string, onChange: (val: string) => void, options: string[], placeholder: string, className: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative w-full">
            <input 
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder={placeholder}
                className={className}
            />
            {isOpen && options.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {options.filter(o => o.toLowerCase().includes((value||'').toLowerCase())).map(option => (
                        <div 
                            key={option} 
                            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onChange(option);
                                setIsOpen(false);
                            }}
                        >
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface InvestmentsProps {
    investments: InvestmentItem[];
    investmentGoals?: InvestmentGoal[];
    refreshData: () => void;
    accountTypes?: string[];
    brokers?: string[];
    stockCodes?: string[];
    investmentAccounts?: import('../types').InvestmentAccount[];
}

type ListSortMode = 'date' | 'name';
const DEFAULT_ACCOUNT_TYPES: AccountType[] = ['일반', 'ISA', 'IRP', '연금저축'];

const Investments: React.FC<InvestmentsProps> = ({ 
    investments: initialInvestments, 
    investmentGoals = [], 
    refreshData, 
    accountTypes = [],
    brokers = [],
    stockCodes = [],
    investmentAccounts = []
}) => {
    const investments = useMemo(() => {
        return initialInvestments.map(inv => {
            if (inv.accountId) {
                const linkedAccount = investmentAccounts.find(acc => acc.id === inv.accountId);
                if (linkedAccount) {
                    return { ...inv, accountType: linkedAccount.accountType };
                }
            }
            return inv;
        });
    }, [initialInvestments, investmentAccounts]);

    const finalAccountTypes = accountTypes.length > 0 ? accountTypes : DEFAULT_ACCOUNT_TYPES;
    const { showSnackbar, showConfirm } = useUI();
    
    // Goal State
    const [localGoals, setLocalGoals] = useState<InvestmentGoal[]>([]);

    const finalCategories = localGoals.length > 0 ? localGoals.map(g => g.category) : INVESTMENT_CATEGORIES;
    const finalBrokers = brokers.length > 0 ? brokers : Array.from(new Set(investments.map(i => i.broker).filter(Boolean)));
    const finalStockCodes = stockCodes.length > 0 ? stockCodes : Array.from(new Set(investments.map(i => i.stockCode).filter(Boolean)));
    
    // UI State
    const [viewMode, setViewMode] = useState<'account' | 'portfolio' | 'simulator'>('account');
    const [investmentTab, setInvestmentTab] = useState<'holdings' | 'sold'>('holdings');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<import('../types').InvestmentAccount | null>(null);
    const [accountFormData, setAccountFormData] = useState<Partial<import('../types').InvestmentAccount>>({});
    const [manageType, setManageType] = useState<'category' | 'accountType' | 'stockCode' | 'broker' | null>(null);
    const [manageList, setManageList] = useState<string[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [newItemName, setNewItemName] = useState('');
    const [isSavingList, setIsSavingList] = useState(false);
    const [editingItem, setEditingItem] = useState<InvestmentItem | null>(null);
    const [formData, setFormData] = useState<Partial<InvestmentItem>>({});
    
    // Filter State
    const [filter, setFilter] = useState({
        category: '전체',
        broker: '전체',
        accountType: '전체',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    // Simulation State
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulatedAdditions, setSimulatedAdditions] = useState<Record<string, number>>({});
    const [projConfig, setProjConfig] = useState<ProjectionConfig>({
        monthlyContribution: 1800000,
        expectedAnnualReturn: 8,
        years: 20
    });

    // Simulator: actual annual returns (for tracking vs plan)
    const ACTUAL_RETURN_START_YEAR = 2026;
    const ACTUAL_RETURN_END_YEAR = 2046;
    const actualReturnYears = useMemo(
        () => Array.from({ length: ACTUAL_RETURN_END_YEAR - ACTUAL_RETURN_START_YEAR + 1 }, (_, i) => ACTUAL_RETURN_START_YEAR + i),
        []
    );
    const [actualAnnualReturns, setActualAnnualReturns] = useState<Record<number, number | null>>({});
    const [actualReturnTab, setActualReturnTab] = useState<'20s' | '30s' | '40s'>('20s');
    const [isLoadingActualReturns, setIsLoadingActualReturns] = useState(false);
    const [isSavingActualReturns, setIsSavingActualReturns] = useState(false);
    const saveReturnsTimerRef = useRef<number | null>(null);

    const loadActualReturnsFromSheet = async () => {
        setIsLoadingActualReturns(true);
        try {
            const fromSheet = await fetchInvestmentAnnualReturns();
            const next: Record<number, number | null> = {};
            actualReturnYears.forEach((y) => {
                const v = fromSheet[y];
                next[y] = typeof v === 'number' && !Number.isNaN(v) ? v : null;
            });
            setActualAnnualReturns(next);
        } catch {
            // ignore
        } finally {
            setIsLoadingActualReturns(false);
        }
    };

    const scheduleSaveActualReturns = (next: Record<number, number | null>) => {
        if (saveReturnsTimerRef.current) window.clearTimeout(saveReturnsTimerRef.current);
        saveReturnsTimerRef.current = window.setTimeout(async () => {
            setIsSavingActualReturns(true);
            try {
                await saveInvestmentAnnualReturns(next);
            } catch (e: any) {
                showSnackbar(`수익률 저장 실패: ${e?.message || '오류'}`, 'error');
            } finally {
                setIsSavingActualReturns(false);
            }
        }, 800);
    };

    useEffect(() => {
        if (viewMode !== 'simulator') return;
        loadActualReturnsFromSheet();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode]);

    useEffect(() => {
        if (viewMode !== 'simulator') return;
        if (!actualReturnYears || actualReturnYears.length === 0) return;
        scheduleSaveActualReturns(actualAnnualReturns);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actualAnnualReturns]);

    // List Sort State
    const [listSortMode, setListSortMode] = useState<ListSortMode>('date');

    useEffect(() => {
        if (investmentGoals.length > 0) {
            setLocalGoals(investmentGoals);
        } else {
            const defaults: Record<string, number> = {
                'ETF': 27, '채권': 35, '금': 18, '세븐스플릿': 20, '주식': 0, '달러': 0
            };
            const initialGoals = Object.entries(defaults).map(([category, targetRatio]) => ({
                category,
                targetRatio
            }));
            setLocalGoals(initialGoals);
        }
    }, [investmentGoals]);

    // --- Stats Calculation ---
    
    const totalInvested = useMemo(() => investments.reduce((acc: number, curr: InvestmentItem) => {
        const remainingQuantity = (curr.quantity || 0) - (curr.soldQuantity || 0);
        const ratio = curr.quantity > 0 ? remainingQuantity / curr.quantity : 0;
        return acc + (curr.totalCost || 0) * ratio;
    }, 0), [investments]);

    const totalMarketValue = useMemo(() => {
        return investments.reduce((acc: number, curr: InvestmentItem) => {
            const curP = curr.currentPrice ?? curr.price ?? 0;
            const remainingQuantity = (curr.quantity || 0) - (curr.soldQuantity || 0);
            const currentVal = curP * remainingQuantity;
            return acc + currentVal;
        }, 0);
    }, [investments]);

    const totalProfit = totalMarketValue - totalInvested;
    const totalProfitRate = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    const totalDeposit = useMemo(() => {
        let sum = 0;
        investmentAccounts.forEach(acc => {
            // cashBalance는 linkedInvestments에서 계산된 예수금이어야 함
            const linkedInvestments = investments.filter(inv => inv.accountId === acc.id);
            const cashBalance = linkedInvestments.reduce((cash, inv) => {
                const q = inv.quantity || 0;
                const soldQ = inv.soldQuantity || 0;
                const remainingQ = q - soldQ;
                const totalCost = inv.totalCost || 0;

                const remainingCostBasis = q > 0 ? totalCost * (remainingQ / q) : 0;
                const soldCostBasis = Math.max(totalCost - remainingCostBasis, 0);

                const soldProceeds = (inv.soldPrice || 0) * (inv.soldQuantity || 0);
                const realized = soldProceeds > 0 ? (soldProceeds - soldCostBasis) : (inv.realizedProfit || 0);
                return cash - remainingCostBasis + realized;
            }, (acc.deposit || 0));
            sum += cashBalance;
        });
        return sum;
    }, [investmentAccounts, investments]);

    // Tax Deduction Estimation
    const taxDeductionInfo = useMemo(() => {
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        let irpContribution = 0;
        let pensionContribution = 0;
        let isaContribution = 0;

        investments.forEach(inv => {
            if (new Date(inv.date) >= yearStart) {
                if (inv.accountType === 'IRP') irpContribution += (inv.totalCost || 0);
                else if (inv.accountType === '연금저축') pensionContribution += (inv.totalCost || 0);
                else if (inv.accountType === 'ISA') isaContribution += (inv.totalCost || 0);
            }
        });

        // Limits
        const IRP_LIMIT = 3000000;
        const PENSION_LIMIT = 6000000;
        const ISA_LIMIT = 20000000;

        // Combined limit for IRP + Pension is 9,000,000
        const totalPensionEligible = Math.min(irpContribution + pensionContribution, 9000000);
        const estimatedTaxDeduction = totalPensionEligible * 0.165;

        return {
            irp: { amount: irpContribution, limit: IRP_LIMIT },
            pension: { amount: pensionContribution, limit: PENSION_LIMIT },
            isa: { amount: isaContribution, limit: ISA_LIMIT },
            totalPensionEligible,
            estimatedTaxDeduction
        };
    }, [investments]);

    // Account Balances
    const accountBalances = useMemo(() => {
        const balances: Record<string, number> = {
            'ISA': 0,
            'IRP': 0,
            '연금저축': 0,
            '일반': 0
        };
        
        // Add deposits from investment accounts
        investmentAccounts.forEach(acc => {
            const type = acc.accountType || '일반';
            if (balances[type] !== undefined) {
                balances[type] += (acc.deposit || 0);
            } else {
                balances[type] = (acc.deposit || 0);
            }
        });

        investments.forEach(inv => {
            const curP = inv.currentPrice ?? inv.price ?? 0;
            const remainingQuantity = (inv.quantity || 0) - (inv.soldQuantity || 0);
            const currentVal = curP * remainingQuantity;
            const type = inv.accountType || '일반';
            if (balances[type] !== undefined) {
                balances[type] += currentVal;
            } else {
                balances[type] = currentVal;
            }
        });
        return balances;
    }, [investments, investmentAccounts]);

    // ISA Limit Logic
    const isaLimitInfo = useMemo(() => {
        const isaAccount = investmentAccounts.find(acc => acc.accountType === 'ISA');
        if (!isaAccount || !isaAccount.openDate) return null;
        
        const start = new Date(isaAccount.openDate);
        if (isNaN(start.getTime())) return null;

        const today = new Date();
        
        let yearsActive = today.getFullYear() - start.getFullYear() + 1;
        if (today.getMonth() < start.getMonth() || (today.getMonth() === start.getMonth() && today.getDate() < start.getDate())) {
            yearsActive--;
        }
        
        const limit = yearsActive * 20000000;
        const totalDeposit = isaAccount.deposit || 0;
        const remaining = limit - totalDeposit;
        
        return {
            openDate: start,
            yearsActive,
            limit,
            totalDeposit,
            remaining,
            isOverLimit: remaining < 0
        };
    }, [investmentAccounts]);

    // Group by category using Current Market Value
    const portfolioMarketStats = useMemo(() => {
        const stats: Record<string, number> = {};
        investments.forEach(inv => {
            const curP = inv.currentPrice ?? inv.price ?? 0;
            const remainingQuantity = (inv.quantity || 0) - (inv.soldQuantity || 0);
            const currentVal = curP * remainingQuantity;
            stats[inv.category] = (stats[inv.category] || 0) + currentVal;
        });
        return stats;
    }, [investments]);

    // --- Simulation Logic ---
    const totalSimulatedAddition = useMemo(() => {
        return (Object.values(simulatedAdditions) as number[]).reduce((a, b) => a + b, 0);
    }, [simulatedAdditions]);

    const totalSimulatedMarketValue = totalMarketValue + totalSimulatedAddition;

    // Portfolio Analysis Logic
    const portfolioAnalysis = useMemo(() => {
        const targets: Record<string, number> = {};
        localGoals.forEach(g => targets[g.category] = g.targetRatio);

        const allCategories = new Set([...Object.keys(portfolioMarketStats), ...localGoals.map(g => g.category)]);

        return Array.from(allCategories).map((cat) => {
            const currentAmount = portfolioMarketStats[cat] || 0;
            const actualRatio = totalMarketValue > 0 ? (currentAmount / totalMarketValue) * 100 : 0;
            const targetRatio = targets[cat] || 0; 
            
            const targetAmountCurrent = totalMarketValue * (targetRatio / 100);
            const adjustmentAmount = targetAmountCurrent - currentAmount;
            
            const addition = Number(simulatedAdditions[cat]) || 0;
            const simulatedAmount = currentAmount + addition;
            const simulatedRatio = totalSimulatedMarketValue > 0 ? (simulatedAmount / totalSimulatedMarketValue) * 100 : 0;
            const simulatedDiff = simulatedRatio - targetRatio;

            const diffRatio = actualRatio - targetRatio;
            let advice = '유지';
            
            if (targetRatio > 0) {
                 if (diffRatio > 2) advice = `과비중 (매도 필요)`;
                 else if (diffRatio < -2) advice = `저비중 (매수 필요)`;
                 else advice = '목표 부합 (유지)';
            } else {
                advice = currentAmount > 0 ? '비중 설정 없음' : '-';
            }

            return {
                category: cat,
                currentAmount,
                actualRatio,
                targetRatio,
                diffRatio,
                adjustmentAmount,
                advice,
                addition,
                simulatedAmount,
                simulatedRatio,
                simulatedDiff
            };
        })
        .filter(r => r.currentAmount > 0 || r.targetRatio > 0)
        .sort((a, b) => b.currentAmount - a.currentAmount);
    }, [portfolioMarketStats, totalMarketValue, localGoals, simulatedAdditions, totalSimulatedMarketValue]);

    // Chart Data
    const chartData = useMemo(() => {
         const stats = isSimulating ? 
            portfolioAnalysis.reduce((acc, curr) => {
                acc[curr.category] = curr.simulatedAmount;
                return acc;
            }, {} as Record<string, number>) :
            portfolioMarketStats;

         const total = isSimulating ? totalSimulatedMarketValue : totalMarketValue;

         return Object.entries(stats)
             .filter(([_, amount]) => Number(amount) > 0)
             .map(([name, amount], index) => ({
                 name,
                 amount: Number(amount),
                 percentage: total > 0 ? (Number(amount) / total) * 100 : 0,
                 color: ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1'][index % 6]
             })).sort((a,b) => b.amount - a.amount);
    }, [portfolioMarketStats, totalMarketValue, isSimulating, portfolioAnalysis, totalSimulatedMarketValue]);

    // Filtered & Sorted List
    const filteredAndSortedInvestments = useMemo(() => {
        let list = investments.filter(inv => {
            const matchCat = filter.category === '전체' || inv.category === filter.category;
            const matchBroker = filter.broker === '전체' || inv.broker === filter.broker;
            const matchAcc = filter.accountType === '전체' || inv.accountType === filter.accountType;
            const matchSearch = !filter.search || 
                inv.name.toLowerCase().includes(filter.search.toLowerCase()) || 
                inv.broker.toLowerCase().includes(filter.search.toLowerCase());
            
            const isSold = !!inv.sellDate;
            const matchTab = investmentTab === 'holdings' ? !isSold : isSold;

            return matchCat && matchBroker && matchAcc && matchSearch && matchTab;
        });

        if (listSortMode === 'date') {
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else {
            list.sort((a, b) => a.name.localeCompare(b.name));
        }
        return list;
    }, [investments, filter, listSortMode, investmentTab]);

    // Projection Data
    const projectionData = useMemo(() => {
        const data = [];
        let balance = totalMarketValue;
        const monthlyRate = Math.pow(1 + projConfig.expectedAnnualReturn / 100, 1/12) - 1;
        
        for (let year = 0; year <= projConfig.years; year++) {
            data.push({
                year: `${year}년`,
                value: Math.round(balance),
                contribution: totalInvested + (projConfig.monthlyContribution * 12 * year)
            });
            
            for (let m = 0; m < 12; m++) {
                balance = (balance + projConfig.monthlyContribution) * (1 + monthlyRate);
            }
        }
        return data;
    }, [totalMarketValue, totalInvested, projConfig]);

    const actualReturnMetrics = useMemo(() => {
        const entries = actualReturnYears
            .map((y) => ({ year: y, r: actualAnnualReturns[y] }))
            .filter((e) => typeof e.r === 'number' && !Number.isNaN(e.r)) as Array<{ year: number; r: number }>;

        const n = entries.length;
        if (n === 0) {
            return {
                entries: [] as Array<{
                    year: number;
                    actual: number;
                    cumActualFactor: number;
                    cumExpectedFactor: number;
                    vsExpectedPct: number;
                }>,
                count: 0,
                cagr: null as number | null,
                expected: projConfig.expectedAnnualReturn,
                last3Avg: null as number | null,
                onTrack: null as boolean | null,
                signal: '실제 수익률을 입력하면 예측 대비 성과를 계산해드려요.' as string
            };
        }

        let cumActualFactor = 1;
        const rows = entries.map((e, idx) => {
            cumActualFactor *= 1 + e.r / 100;
            const yearsElapsed = idx + 1;
            const cumExpectedFactor = Math.pow(1 + projConfig.expectedAnnualReturn / 100, yearsElapsed);
            const vsExpectedPct = ((cumActualFactor / cumExpectedFactor) - 1) * 100;
            return {
                year: e.year,
                actual: e.r,
                cumActualFactor,
                cumExpectedFactor,
                vsExpectedPct
            };
        });

        const cagr = Math.pow(cumActualFactor, 1 / n) - 1;
        const last3 = entries.slice(-3);
        const last3Avg = last3.length > 0 ? last3.reduce((a, b) => a + b.r, 0) / last3.length : null;

        const expected = projConfig.expectedAnnualReturn / 100;
        const cagrPct = cagr * 100;

        // Simple decision aid:
        // - onTrack: CAGR within -1%p of expected
        // - signal: review if CAGR < expected-2%p or recent 3Y avg < expected-3%p or cumulative gap < -5%
        const gapCagrPp = cagrPct - projConfig.expectedAnnualReturn;
        const cumGapPct = rows[rows.length - 1]?.vsExpectedPct ?? 0;
        const recentGapPp = (last3Avg ?? projConfig.expectedAnnualReturn) - projConfig.expectedAnnualReturn;

        const onTrack = gapCagrPp >= -1;
        const needsReview = gapCagrPp <= -2 || recentGapPp <= -3 || cumGapPct <= -5;

        let signal = onTrack ? '대체로 계획(예상 수익률) 범위 내입니다.' : '계획 대비 뒤처지고 있어요.';
        if (needsReview) signal = '리밸런싱/전략 점검을 권장합니다. (최근 성과 또는 누적 격차 기준)';

        return {
            entries: rows,
            count: n,
            cagr: cagrPct,
            expected: projConfig.expectedAnnualReturn,
            last3Avg,
            onTrack,
            signal
        };
    }, [actualAnnualReturns, actualReturnYears, projConfig.expectedAnnualReturn]);

    // --- Handlers ---
    const handleOpenModal = (item?: InvestmentItem) => {
        if (item) {
            setEditingItem(item);
            setFormData({ ...item });
        } else {
            setEditingItem(null);
            setFormData({
                name: '', broker: '', category: finalCategories[0] || INVESTMENT_CATEGORIES[0], accountType: '일반',
                accountId: '',
                date: new Date().toISOString().split('T')[0],
                price: 0, quantity: 0, totalCost: 0, targetRatio: 0, targetPrice: 0, actualPrice: 0, realizedProfit: 0, note: '',
                stockCode: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleAutoCalculateTotal = () => {
        if(formData.price && formData.quantity) {
            setFormData({...formData, totalCost: formData.price * formData.quantity});
        }
    };

    const handleCostInput = (field: 'price' | 'totalCost', value: string) => {
        const num = parseFloat(value.replace(/,/g, '')) || 0;
        setFormData({ ...formData, [field]: num });
    };

    const handleSave = async () => {
        if (!formData.name || !formData.category) {
            showSnackbar('종목명과 카테고리는 필수입니다.', 'error');
            return;
        }

        try {
            if (editingItem && editingItem.rowIndex) {
                await updateInvestment(editingItem.rowIndex, { ...editingItem, ...formData } as InvestmentItem);
                showSnackbar('수정되었습니다.', 'success');
            } else {
                await addInvestment({
                    id: generateUniqueId(),
                    accountId: formData.accountId,
                    name: formData.name!,
                    broker: formData.broker || '',
                    category: formData.category!,
                    accountType: formData.accountType || '일반',
                    date: formData.date || '',
                    price: formData.price || 0,
                    quantity: formData.quantity || 0,
                    totalCost: formData.totalCost || 0,
                    targetRatio: formData.targetRatio || 0,
                    targetPrice: formData.targetPrice || 0,
                    actualPrice: formData.actualPrice || 0,
                    realizedProfit: formData.realizedProfit || 0,
                    note: formData.note || '',
                    stockCode: formData.stockCode || '',
                    sellDate: formData.sellDate || '',
                    soldQuantity: formData.soldQuantity || 0,
                    soldPrice: formData.soldPrice || 0
                });
                showSnackbar('추가되었습니다.', 'success');
            }
            setIsModalOpen(false);
            refreshData();
        } catch (e) {
            showSnackbar('저장 실패', 'error');
        }
    };

    const handleDelete = async () => {
        if (!editingItem || !editingItem.rowIndex) return;
        showConfirm('이 투자 내역을 삭제하시겠습니까?', async () => {
            try {
                await deleteInvestment(editingItem.rowIndex!);
                showSnackbar('삭제되었습니다.', 'success');
                setIsModalOpen(false);
                refreshData();
            } catch (e) {
                showSnackbar('삭제 실패', 'error');
            }
        });
    };

    const handleSaveGoals = async () => {
        const validGoals = localGoals.filter(g => g.category.trim() !== '');
        
        const totalRatio = validGoals.reduce((a, b) => a + b.targetRatio, 0);
        if (totalRatio !== 100) {
            showSnackbar('목표 비중의 합계가 100%가 아닙니다.', 'error');
            return;
        }

        try {
            await updateInvestmentGoals(validGoals);
            showSnackbar('목표 비중이 구글 시트에 저장되었습니다.', 'success');
            setIsGoalModalOpen(false);
            refreshData();
        } catch(e) {
            showSnackbar('목표 저장 실패', 'error');
        }
    };

    const handleSimulatedAddition = (category: string, value: string) => {
        const num = parseFloat(value.replace(/,/g, '')) || 0;
        setSimulatedAdditions(prev => ({ ...prev, [category]: num }));
    };

    const clearSimulation = () => {
        setSimulatedAdditions({});
        showSnackbar('시뮬레이션 데이터가 초기화되었습니다.', 'info');
    };

    const handleOpenInvestmentManage = (type: 'category' | 'accountType' | 'stockCode' | 'broker') => {
        setManageType(type);
        if (type === 'category') setManageList([...finalCategories]);
        else if (type === 'accountType') setManageList([...finalAccountTypes]);
        else if (type === 'stockCode') setManageList([...finalStockCodes]);
        else if (type === 'broker') setManageList([...finalBrokers]);
        setIsManageModalOpen(true);
    };

    const handleAddItem = () => {
        if (!newItemName.trim()) return;
        if (manageList.includes(newItemName.trim())) {
            showSnackbar('이미 존재하는 항목입니다.', 'error');
            return;
        }
        setManageList([...manageList, newItemName.trim()]);
        setNewItemName('');
    };

    const handleStartEdit = (idx: number) => {
        setEditingIdx(idx);
        setEditingValue(manageList[idx]);
    };

    const handleSaveEdit = () => {
        if (editingIdx === null || !editingValue.trim()) return;
        const oldName = manageList[editingIdx];
        if (oldName !== editingValue.trim() && manageList.includes(editingValue.trim())) {
            showSnackbar('이미 존재하는 항목입니다.', 'error');
            return;
        }
        const nextList = [...manageList];
        nextList[editingIdx] = editingValue.trim();
        setManageList(nextList);
        setEditingIdx(null);
    };

    const handleRemoveItem = (index: number) => {
        const item = manageList[index];
        showConfirm(`'${item}' 항목을 삭제하시겠습니까?`, () => {
            const next = manageList.filter((_, i) => i !== index);
            setManageList(next);
        });
    };

    const handleSaveList = async () => {
        setIsSavingList(true);
        try {
            // 모든 항목에 대해 리스트 업데이트를 수행하도록 수정
            if (manageType === 'accountType') {
                await updateInvestmentAccountTypes(manageList);
            } else if (manageType === 'stockCode') {
                await updateInvestmentStockCodes(manageList);
            } else if (manageType === 'broker') {
                await updateInvestmentBrokers(manageList);
            } else if (manageType === 'category') {
                const newGoals = manageList.map(cat => {
                    const existing = localGoals.find(g => g.category === cat);
                    return existing || { category: cat, targetRatio: 0 };
                });
                await updateInvestmentGoals(newGoals);
            }
            
            showSnackbar('항목이 성공적으로 저장되었습니다.', 'success');
            setIsManageModalOpen(false);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error('Failed to save list:', error);
            showSnackbar('저장 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsSavingList(false);
        }
    };

    const handleSaveAccount = async () => {
        if (!accountFormData.accountType || !accountFormData.bankName || !accountFormData.accountName || !accountFormData.accountNumber || !accountFormData.openDate) {
            showSnackbar('필수 항목을 모두 입력해주세요.', 'error');
            return;
        }
        try {
            if (editingAccount && editingAccount.rowIndex) {
                await updateInvestmentAccount(editingAccount.rowIndex, { ...editingAccount, ...accountFormData } as import('../types').InvestmentAccount);
                showSnackbar('계좌가 수정되었습니다.', 'success');
            } else {
                await addInvestmentAccount({
                    id: generateUniqueId(),
                    accountType: accountFormData.accountType,
                    bankName: accountFormData.bankName,
                    accountName: accountFormData.accountName,
                    accountNumber: accountFormData.accountNumber,
                    openDate: accountFormData.openDate,
                    deposit: accountFormData.deposit || 0,
                    closeDate: accountFormData.closeDate || '',
                    note: accountFormData.note || ''
                });
                showSnackbar('계좌가 추가되었습니다.', 'success');
            }
            setIsAddAccountModalOpen(false);
            setIsEditAccountModalOpen(false);
            refreshData();
        } catch (e: any) {
            showSnackbar('계좌 저장 실패: ' + e.message, 'error');
        }
    };

    const handleDeleteAccount = async (rowIndex: number) => {
        showConfirm('이 계좌를 삭제하시겠습니까?', async () => {
            try {
                await deleteInvestmentAccount(rowIndex);
                showSnackbar('계좌가 삭제되었습니다.', 'success');
                setIsAddAccountModalOpen(false);
                setIsEditAccountModalOpen(false);
                refreshData();
            } catch (e: any) {
                showSnackbar('계좌 삭제 실패: ' + e.message, 'error');
            }
        });
    };

    return (
        <div className="pb-24 animate-fade-in min-h-screen relative">
            {/* Header Summary */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 -mx-5 px-5 pt-4 pb-8 mb-4 shadow-lg shadow-indigo-900/20">
                <div className="flex justify-between items-start text-white mb-2">
                    <div className="space-y-4">
                        <div>
                            <div className="text-[10px] opacity-70 uppercase tracking-wider font-bold">
                                {isSimulating ? '예상 평가 자산 (시뮬레이션)' : '현재 평가 자산'}
                            </div>
                            <div className="text-3xl font-black">
                                {formatCurrency(Math.round(isSimulating ? totalSimulatedMarketValue : totalMarketValue))}
                            </div>
                            <div className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${totalProfit >= 0 ? 'text-red-300' : 'text-blue-300'}`}>
                                {totalProfit >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(Math.round(totalProfit)))} ({totalProfitRate.toFixed(2)}%)
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div>
                                <div className="text-[9px] opacity-60 font-bold uppercase">총 매수 금액</div>
                                <div className="text-sm font-bold opacity-90">{formatCurrency(Math.round(totalInvested))}</div>
                            </div>
                            <div>
                                <div className="text-[9px] opacity-60 font-bold uppercase">총 예수금</div>
                                <div className="text-sm font-bold opacity-90">{formatCurrency(Math.round(totalDeposit))}</div>
                            </div>
                            {isSimulating && totalSimulatedAddition > 0 && (
                                <div>
                                    <div className="text-[9px] opacity-60 font-bold uppercase text-orange-300">추가 투자액</div>
                                    <div className="text-sm font-bold text-orange-100">+{formatCurrency(Math.round(totalSimulatedAddition))}</div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                    </div>
                </div>
                <div className="flex bg-white/10 p-1 rounded-xl mt-4">
                    <button 
                        onClick={() => setViewMode('account')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'account' ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                    >
                        투자 계좌
                    </button>
                    <button 
                        onClick={() => setViewMode('portfolio')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'portfolio' ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                    >
                        포트폴리오
                    </button>
                    <button 
                        onClick={() => setViewMode('simulator')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'simulator' ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                    >
                        미래 자산 예측
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="space-y-4 px-1">
                {viewMode === 'account' ? (
                    <div className="space-y-4">
                        {/* Account Balances Card */}
                        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">계좌별 잔고</h3>
                                <button
                                    onClick={() => { setEditingAccount(null); setAccountFormData({}); setIsAddAccountModalOpen(true); }}
                                    className="text-[10px] text-blue-500 font-bold px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform"
                                >
                                    추가
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {investmentAccounts.map((acc, idx) => {
                                    let bgClass = "bg-gray-50 dark:bg-black/20";
                                    let textClass = "text-gray-500";
                                    let valueClass = "dark:text-white";
                                    let borderClass = "";
                                    
                                    if (acc.accountType === 'ISA') {
                                        bgClass = "bg-indigo-50 dark:bg-indigo-900/10";
                                        textClass = "text-indigo-600 dark:text-indigo-400";
                                        valueClass = "text-indigo-700 dark:text-indigo-300";
                                        borderClass = "border border-indigo-100 dark:border-indigo-900/30";
                                    } else if (acc.accountType === '연금저축') {
                                        bgClass = "bg-emerald-50 dark:bg-emerald-900/10";
                                        textClass = "text-emerald-600 dark:text-emerald-400";
                                        valueClass = "text-emerald-700 dark:text-emerald-300";
                                        borderClass = "border border-emerald-100 dark:border-emerald-900/30";
                                    } else if (acc.accountType === 'IRP') {
                                        bgClass = "bg-blue-50 dark:bg-blue-900/10";
                                        textClass = "text-blue-600 dark:text-blue-400";
                                        valueClass = "text-blue-700 dark:text-blue-300";
                                        borderClass = "border border-blue-100 dark:border-blue-900/30";
                                    }

                                    const linkedInvestments = investments.filter(inv => inv.accountId === acc.id);
                                    const openPositions = linkedInvestments.filter(inv => ((inv.quantity || 0) - (inv.soldQuantity || 0)) > 0);

                                    // 1) 투자금(평가금): 미매도 잔여수량 * 현재가
                                    const marketValue = openPositions.reduce((sum, inv) => {
                                        const curP = inv.currentPrice ?? inv.price ?? 0;
                                        const remainingQuantity = (inv.quantity || 0) - (inv.soldQuantity || 0);
                                        return sum + (curP * remainingQuantity);
                                    }, 0);

                                    // 2) 예수금(추정): 납입액 - (미매도분 매수원가) + (매도 실현손익)
                                    // - 부분매도를 고려해 매수원가를 비율로 분해
                                    const cashBalance = linkedInvestments.reduce((cash, inv) => {
                                        const q = inv.quantity || 0;
                                        const soldQ = inv.soldQuantity || 0;
                                        const remainingQ = q - soldQ;
                                        const totalCost = inv.totalCost || 0;

                                        const remainingCostBasis = q > 0 ? totalCost * (remainingQ / q) : 0;
                                        const soldCostBasis = Math.max(totalCost - remainingCostBasis, 0);

                                        const soldPrice = inv.soldPrice || 0;
                                        const soldProceeds = soldPrice > 0 && soldQ > 0 ? soldPrice * soldQ : 0;
                                        const realized = soldProceeds > 0 ? (soldProceeds - soldCostBasis) : (inv.realizedProfit || 0);

                                        return cash - remainingCostBasis + realized;
                                    }, (acc.deposit || 0));

                                    return (
                                        <div key={idx} onClick={() => { setEditingAccount(acc); setAccountFormData(acc); setIsEditAccountModalOpen(true); }} className={`${bgClass} ${borderClass} p-3 rounded-xl cursor-pointer active:scale-95 transition-transform`}>
                                            <div className={`text-[10px] ${textClass} mb-1 truncate`}>{acc.accountName || acc.accountType}</div>
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500">예수금: {formatCurrency(cashBalance)}</div>
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500">투자금: {formatCurrency(marketValue)}</div>
                                            <div className={`text-sm font-bold ${valueClass}`}>{formatCurrency(acc.deposit || 0)}</div>
                                        </div>
                                    );
                                })}
                                {investmentAccounts.length === 0 && (
                                    <div className="col-span-2 text-center py-4 text-xs text-gray-500">등록된 계좌가 없습니다.</div>
                                )}
                            </div>
                        </div>

                        {/* ISA Limit Card */}
                        {isaLimitInfo && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">ISA 납입 한도 ({isaLimitInfo.yearsActive}년차)</div>
                                        <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                            누적 한도: {formatCurrency(isaLimitInfo.limit)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 font-bold mb-0.5">잔여 한도</div>
                                        <div className={`text-sm font-bold ${isaLimitInfo.isOverLimit ? 'text-red-500' : 'text-indigo-700 dark:text-indigo-300'}`}>
                                            {isaLimitInfo.isOverLimit ? '초과 ' : ''}{formatCurrency(isaLimitInfo.remaining)}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full bg-indigo-200 dark:bg-indigo-900/50 rounded-full h-1.5 mb-2">
                                    <div className={`h-1.5 rounded-full ${isaLimitInfo.isOverLimit ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, (isaLimitInfo.totalDeposit / isaLimitInfo.limit) * 100)}%` }}></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-indigo-500 dark:text-indigo-400">
                                    <span>{isaLimitInfo.openDate.toISOString().split('T')[0]} 개설</span>
                                    <span>총 납입액: {formatCurrency(isaLimitInfo.totalDeposit)}</span>
                                </div>
                            </div>
                        )}

                        {/* Tax Savings Card */}
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">예상 세액 공제금 (IRP/연금저축)</div>
                                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(taxDeductionInfo.estimatedTaxDeduction)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-bold mb-0.5">올해 납입액</div>
                                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(taxDeductionInfo.totalPensionEligible)} / 900만</div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                {/* IRP Bar */}
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold mb-1">
                                        <span className="text-blue-600 dark:text-blue-400">IRP</span>
                                        <span className="text-gray-500">{formatCurrency(taxDeductionInfo.irp.amount)} / {formatCurrency(taxDeductionInfo.irp.limit)}</span>
                                    </div>
                                    <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5">
                                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (taxDeductionInfo.irp.amount / taxDeductionInfo.irp.limit) * 100)}%` }}></div>
                                    </div>
                                </div>
                                
                                {/* Pension Bar */}
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold mb-1">
                                        <span className="text-emerald-600 dark:text-emerald-400">연금저축펀드</span>
                                        <span className="text-gray-500">{formatCurrency(taxDeductionInfo.pension.amount)} / {formatCurrency(taxDeductionInfo.pension.limit)}</span>
                                    </div>
                                    <div className="w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full h-1.5">
                                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (taxDeductionInfo.pension.amount / taxDeductionInfo.pension.limit) * 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : viewMode === 'portfolio' ? (
                    <>
                        {/* Donut Chart */}
                        <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 dark:text-white">
                                포트폴리오 구성 {isSimulating && '(예측)'}
                            </h3>
                            <div className="flex justify-center mb-6">
                                <div className="relative w-40 h-40 flex items-center justify-center">
                                     <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90 absolute top-0 left-0">
                                        <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="20" className="text-gray-100 dark:text-white/5" />
                                        {(() => {
                                            let acc = 0;
                                            const circumference = 2 * Math.PI * 70;
                                            return chartData.map(item => {
                                                const dash = (item.percentage / 100) * circumference;
                                                const offset = -((acc / 100) * circumference);
                                                acc += item.percentage;
                                                return (
                                                    <circle key={item.name} cx="80" cy="80" r="70" fill="none" stroke={item.color} strokeWidth="20" strokeDasharray={`${dash} ${circumference}`} strokeDashoffset={offset} className="transition-all duration-500" />
                                                );
                                            });
                                        })()}
                                     </svg>
                                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                         <span className="text-[10px] text-gray-500 font-bold mb-1">보유 종목</span>
                                         <span className="text-3xl font-black dark:text-white leading-none">{investments.filter(inv => (inv.quantity || 0) - (inv.soldQuantity || 0) > 0).length}</span>
                                     </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {chartData.map(item => (
                                    <div key={item.name} className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: item.color}}></span>
                                            <span className="dark:text-gray-300 font-medium">{item.name}</span>
                                        </div>
                                        <span className="font-bold dark:text-white">{item.percentage.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Portfolio Analysis Table */}
                        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm overflow-x-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold dark:text-white">목표 비중 분석</h3>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={() => setIsSimulating(!isSimulating)}
                                        className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${isSimulating ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}
                                    >
                                        {isSimulating ? '플래너 종료' : '리밸런싱 플래너'}
                                    </button>
                                    <button 
                                        onClick={() => setIsGoalModalOpen(true)}
                                        className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-bold"
                                    >
                                        비중 편집
                                    </button>
                                </div>
                            </div>

                            {isSimulating && (
                                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl p-3 mb-4 animate-fade-in">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] text-orange-600 dark:text-orange-400 font-bold">투자 예정 금액 시뮬레이션</span>
                                        <button onClick={clearSimulation} className="text-[10px] text-orange-500 underline font-bold">초기화</button>
                                    </div>
                                </div>
                            )}

                            <table className="w-full text-[11px] text-left">
                                <thead>
                                    <tr className="text-gray-500 border-b border-gray-200 dark:border-white/10 uppercase tracking-tighter">
                                        <th className="pb-2 pl-1">항목</th>
                                        <th className="pb-2 text-center">{isSimulating ? '예측(%)' : '실제(%)'}</th>
                                        <th className="pb-2 text-center">목표(%)</th>
                                        <th className="pb-2 text-right pr-1">조정 필요액</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {portfolioAnalysis.map((row) => (
                                        <React.Fragment key={row.category}>
                                            <tr className={`border-b border-gray-100 dark:border-white/5 last:border-0 ${isSimulating ? 'bg-orange-500/[0.02]' : ''}`}>
                                                <td className="py-4 pl-1 font-bold dark:text-white">{row.category}</td>
                                                <td className="py-4 text-center">
                                                    <div className="font-black dark:text-gray-300">
                                                        {(isSimulating ? row.simulatedRatio : row.actualRatio).toFixed(1)}%
                                                    </div>
                                                    {isSimulating && row.addition !== 0 && (
                                                        <div className={`text-[9px] font-bold ${row.simulatedRatio > row.actualRatio ? 'text-red-400' : 'text-blue-400'}`}>
                                                            ({row.actualRatio.toFixed(1)}% → {row.simulatedRatio.toFixed(1)}%)
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 text-center text-gray-400 font-medium">{row.targetRatio > 0 ? `${row.targetRatio}%` : '-'}</td>
                                                <td className="py-4 text-right pr-1">
                                                    <div className={`font-black ${row.adjustmentAmount > 0 ? 'text-blue-500' : row.adjustmentAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                        {row.targetRatio > 0 ? (
                                                            <>
                                                                {row.adjustmentAmount > 0 ? `+${(row.adjustmentAmount / 10000).toFixed(1)}만` : `${(row.adjustmentAmount / 10000).toFixed(1)}만`}
                                                            </>
                                                        ) : '-'}
                                                    </div>
                                                    <div className="text-[9px] text-gray-400 font-medium mt-0.5">{row.advice}</div>
                                                </td>
                                            </tr>
                                            {isSimulating && (
                                                <tr>
                                                    <td colSpan={4} className="pb-8 pt-2 px-1">
                                                        <div className="relative group">
                                                            <input 
                                                                type="text"
                                                                inputMode="numeric"
                                                                placeholder="0"
                                                                value={simulatedAdditions[row.category] ? simulatedAdditions[row.category].toLocaleString() : ''}
                                                                onChange={(e) => handleSimulatedAddition(row.category, e.target.value)}
                                                                className="w-full h-16 bg-white dark:bg-white/5 border-2 border-orange-500/20 rounded-2xl px-5 text-2xl font-black dark:text-white outline-none focus:border-orange-500/50 focus:ring-4 ring-orange-500/10 transition-all placeholder-gray-400 dark:placeholder-gray-600 pr-20"
                                                            />
                                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                                                {simulatedAdditions[row.category] > 0 && (
                                                                    <button 
                                                                        onClick={() => handleSimulatedAddition(row.category, '0')}
                                                                        className="w-6 h-6 flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 text-xs font-bold hover:bg-orange-200"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                )}
                                                                <span className="text-sm text-orange-500 font-black">원</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
                                                             {[1, 10, 20, 30].map(amt => (
                                                                 <button 
                                                                    key={amt} 
                                                                    onClick={() => handleSimulatedAddition(row.category, ((simulatedAdditions[row.category] || 0) + (amt * 10000)).toString())}
                                                                    className="h-12 min-w-[70px] px-3 flex items-center justify-center bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl text-xs font-black border border-orange-500/10 active:scale-95 transition-transform shadow-sm"
                                                                 >
                                                                     +{amt}만
                                                                 </button>
                                                             ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Filters & Search */}
                        <div className="flex flex-col gap-4 pt-2">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text"
                                        placeholder="종목명 또는 증권사 검색..."
                                        value={filter.search}
                                        onChange={e => setFilter({...filter, search: e.target.value})}
                                        className="w-full h-12 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl pl-12 pr-4 text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                    />
                                </div>
                                <button 
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500'}`}
                                >
                                    <Filter size={20} />
                                </button>
                            </div>

                            <AnimatePresence>
                                {showFilters && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/5 grid grid-cols-3 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Category</label>
                                                <select 
                                                    value={filter.category}
                                                    onChange={e => setFilter({...filter, category: e.target.value})}
                                                    className="w-full h-10 bg-gray-50 dark:bg-black rounded-xl px-3 text-xs outline-none"
                                                >
                                                    {['전체', ...finalCategories].map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Broker</label>
                                                <select 
                                                    value={filter.broker}
                                                    onChange={e => setFilter({...filter, broker: e.target.value})}
                                                    className="w-full h-10 bg-gray-50 dark:bg-black rounded-xl px-3 text-xs outline-none"
                                                >
                                                    {['전체', ...finalBrokers].map(b => <option key={b} value={b}>{b}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Account</label>
                                                <select 
                                                    value={filter.accountType}
                                                    onChange={e => setFilter({...filter, accountType: e.target.value})}
                                                    className="w-full h-10 bg-gray-50 dark:bg-black rounded-xl px-3 text-xs outline-none"
                                                >
                                                    {['전체', ...finalAccountTypes].map(a => <option key={a} value={a}>{a}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Investment List Cards with Sorting */}
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="text-lg font-bold dark:text-white">투자현황</h3>
                                <div className="flex gap-1.5 bg-gray-100 dark:bg-white/10 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setListSortMode('date')}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${listSortMode === 'date' ? 'bg-white dark:bg-gray-800 text-indigo-500 shadow-sm' : 'text-gray-400'}`}
                                    >
                                        날짜순
                                    </button>
                                    <button 
                                        onClick={() => setListSortMode('name')}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${listSortMode === 'name' ? 'bg-white dark:bg-gray-800 text-indigo-500 shadow-sm' : 'text-gray-400'}`}
                                    >
                                        이름순
                                    </button>
                                </div>
                            </div>
                            
                            {/* Tabs */}
                            <div className="flex gap-2 px-1 mb-2">
                                <button 
                                    onClick={() => setInvestmentTab('holdings')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors ${investmentTab === 'holdings' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'}`}
                                >
                                    보유 종목
                                </button>
                                <button 
                                    onClick={() => setInvestmentTab('sold')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors ${investmentTab === 'sold' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'}`}
                                >
                                    매도 종목
                                </button>
                            </div>

                            {filteredAndSortedInvestments.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    {investmentTab === 'holdings' ? '보유 중인 투자 내역이 없습니다.' : '매도한 투자 내역이 없습니다.'}
                                </div>
                            ) : (
                                filteredAndSortedInvestments.map(inv => {
                                    // Rounded current price to avoid decimal issues (e.g. Dollar)
                                    const curPrice = Math.round(inv.currentPrice || inv.price);
                                    const profit = (curPrice - inv.price) * inv.quantity;
                                    const profitRate = ((curPrice - inv.price) / inv.price) * 100;
                                    const isPositive = profit >= 0;
                                    const currentTotalValue = curPrice * inv.quantity;

                                    return (
                                        <div key={inv.id} onClick={() => handleOpenModal(inv)} className="bg-white dark:bg-white/5 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.98] transition-all cursor-pointer">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{inv.category}</div>
                                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-gray-100 dark:bg-white/10 px-1.5 rounded">{inv.accountType}</div>
                                                        {inv.stockCode && <div className="text-[9px] text-gray-400 font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">{inv.stockCode}</div>}
                                                    </div>
                                                    <div className="text-lg font-bold dark:text-white leading-none mb-1.5 truncate max-w-[180px]">{inv.name}</div>
                                                    <div className="text-[10px] text-gray-400">{inv.broker} | {inv.date} 매수</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-gray-900 dark:text-white text-base">{formatCurrency(Math.round(currentTotalValue))}</div>
                                                    <div className="text-[10px] text-gray-500">평가금액 ({inv.quantity}주)</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex justify-between items-center border-t border-gray-100 dark:border-white/5 pt-3 mt-1">
                                                <div>
                                                    <div className="text-[10px] text-gray-400 mb-0.5">현재가 / 평균단가</div>
                                                    <div className="text-xs font-bold dark:text-gray-200">
                                                        <span className="text-indigo-500">{curPrice.toLocaleString()}원</span>
                                                        <span className="text-gray-300 dark:text-gray-600 mx-1.5">|</span>
                                                        <span className="text-gray-500">{Math.round(inv.price).toLocaleString()}원</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-gray-400 mb-0.5">평가 손익</div>
                                                    <div className={`text-sm font-black ${isPositive ? 'text-red-500' : 'text-blue-500'}`}>
                                                        {isPositive ? '+' : ''}{Math.round(profit).toLocaleString()}원 ({profitRate.toFixed(2)}%)
                                                    </div>
                                                </div>
                                            </div>

                                            {inv.category === '세븐스플릿' && (
                                                <div className="mt-3 text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 px-3 py-2 rounded-xl flex justify-between items-center border border-green-200 dark:border-green-800/30">
                                                    <span className="font-bold flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                        수익실현 (누적)
                                                    </span>
                                                    <span className="font-black">{formatCurrency(Math.round(inv.realizedProfit))}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                ) : (
                    /* Simulator View */
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white dark:bg-white/5 rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
                                <Calculator className="text-indigo-500" size={20} />
                                미래 자산 시뮬레이터
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4 mb-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">월 추가 투자금</label>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            inputMode="numeric"
                                            value={projConfig.monthlyContribution.toLocaleString()}
                                            onChange={e => {
                                                const val = parseInt(e.target.value.replace(/,/g, '')) || 0;
                                                setProjConfig({...projConfig, monthlyContribution: val});
                                            }}
                                            className="w-full h-12 bg-gray-50 dark:bg-black rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">원</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">예상 연 수익률</label>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                value={projConfig.expectedAnnualReturn}
                                                onChange={e => setProjConfig({...projConfig, expectedAnnualReturn: parseFloat(e.target.value) || 0})}
                                                className="w-full h-12 bg-gray-50 dark:bg-black rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">투자 기간</label>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                value={projConfig.years}
                                                onChange={e => setProjConfig({...projConfig, years: parseInt(e.target.value) || 0})}
                                                className="w-full h-12 bg-gray-50 dark:bg-black rounded-xl px-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">년</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-64 w-full -ml-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                                            tickFormatter={(val) => `${(val / 100000000).toFixed(1)}억`}
                                        />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                            formatter={(val: number) => formatCurrency(val)}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                        <Line type="monotone" dataKey="contribution" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-8 p-5 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                                <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">{projConfig.years}년 후 예상 자산</div>
                                <div className="text-3xl font-black text-indigo-900 dark:text-white mb-4">
                                    {formatCurrency(projectionData[projectionData.length - 1].value)}
                                </div>
                                <div className="flex justify-between items-center border-t border-indigo-200/50 dark:border-indigo-500/20 pt-3">
                                    <div className="text-xs font-bold text-gray-500">총 투입 원금</div>
                                    <div className="text-sm font-black text-gray-700 dark:text-gray-300">
                                        {formatCurrency(projectionData[projectionData.length - 1].contribution)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actual return tracking (2026~2046) */}
                        <div className="bg-white dark:bg-white/5 rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">실제 연 수익률 기록</div>
                                    <div className="text-base font-black dark:text-white">2026년 ~ 2046년</div>
                                </div>
                                <button
                                    onClick={() => {
                                        const next: Record<number, number | null> = {};
                                        actualReturnYears.forEach((y) => (next[y] = null));
                                        setActualAnnualReturns(next);
                                    }}
                                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 active:scale-95 transition-transform"
                                >
                                    초기화
                                </button>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex-1 overflow-x-auto no-scrollbar">
                                    <div className="inline-flex bg-gray-100 dark:bg-white/10 p-1 rounded-xl whitespace-nowrap">
                                        <button
                                            onClick={() => setActualReturnTab('20s')}
                                            className={`px-4 py-2 text-[11px] font-black rounded-lg transition-all ${actualReturnTab === '20s' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-gray-500'}`}
                                        >
                                            20년대
                                        </button>
                                        <button
                                            onClick={() => setActualReturnTab('30s')}
                                            className={`px-4 py-2 text-[11px] font-black rounded-lg transition-all ${actualReturnTab === '30s' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-gray-500'}`}
                                        >
                                            30년대
                                        </button>
                                        <button
                                            onClick={() => setActualReturnTab('40s')}
                                            className={`px-4 py-2 text-[11px] font-black rounded-lg transition-all ${actualReturnTab === '40s' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-gray-500'}`}
                                        >
                                            40년대
                                        </button>
                                    </div>
                                </div>
                                <div className="ml-3 flex items-center gap-2 text-[10px] font-black text-gray-400 shrink-0">
                                    {isLoadingActualReturns || isSavingActualReturns ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-indigo-500 animate-spin" />
                                            {isLoadingActualReturns ? '불러오는 중' : '저장 중'}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5">
                                            <CheckIcon size={14} className="text-green-500" />
                                            자동 저장됨
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mb-5 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
                                <div className="bg-gray-50 dark:bg-black/20 px-4 py-2.5 flex items-center justify-between">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">연도</div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">수익률</div>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-transparent">
                                    {actualReturnYears
                                        .filter((y) => actualReturnTab === '20s' ? y <= 2029 : actualReturnTab === '30s' ? (y >= 2030 && y <= 2039) : y >= 2040)
                                        .map((y) => (
                                            <div key={y} className="px-4 py-3 flex items-center justify-between gap-3">
                                                <div className="text-[12px] font-black text-gray-800 dark:text-gray-200 shrink-0">
                                                    {y}
                                                    <span className="text-[10px] font-black text-gray-400 ml-1">년</span>
                                                </div>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="relative w-[7.5rem]">
                                                        <input
                                                            type="number"
                                                            inputMode="decimal"
                                                            step="0.01"
                                                            placeholder="8.0"
                                                            aria-label={`${y}년 수익률(%)`}
                                                            value={actualAnnualReturns[y] ?? ''}
                                                            onChange={(e) => {
                                                                const raw = e.target.value;
                                                                const v = raw === '' ? null : Number(raw);
                                                                setActualAnnualReturns((prev) => ({ ...prev, [y]: (v === null || Number.isNaN(v)) ? null : v }));
                                                            }}
                                                            className="w-full h-10 bg-gray-50 dark:bg-black rounded-xl px-3 pr-9 text-sm font-black outline-none focus:ring-2 ring-indigo-500/20 text-right appearance-none"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-black text-[10px]">%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-black dark:text-white">예측 대비 성과</div>
                                    <div className={`text-[10px] font-black px-2 py-1 rounded-full ${actualReturnMetrics.onTrack ? 'bg-green-500/15 text-green-600 dark:text-green-400' : actualReturnMetrics.onTrack === false ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-gray-200 dark:bg-white/10 text-gray-500'}`}>
                                        {actualReturnMetrics.onTrack === null ? '데이터 없음' : actualReturnMetrics.onTrack ? '순항' : '부진'}
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="text-[11px] font-black text-gray-700 dark:text-gray-200">
                                        {actualReturnMetrics.cagr === null ? (
                                            <span className="text-gray-500 font-bold">입력된 연 수익률이 아직 없어요. 한두 개만 입력해도 요약이 표시돼.</span>
                                        ) : (
                                            <span>
                                                실제 CAGR <span className="text-indigo-600 dark:text-indigo-400">{actualReturnMetrics.cagr.toFixed(2)}%</span>
                                                <span className="text-gray-400 font-black mx-1.5">•</span>
                                                목표 {actualReturnMetrics.expected.toFixed(2)}%
                                                {actualReturnMetrics.last3Avg !== null && (
                                                    <>
                                                        <span className="text-gray-400 font-black mx-1.5">•</span>
                                                        최근 3년 {actualReturnMetrics.last3Avg.toFixed(2)}%
                                                    </>
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {actualReturnMetrics.cagr !== null && (
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-[10px] font-black text-gray-400">
                                                <span>0%</span>
                                                <span className="text-gray-500">목표 {actualReturnMetrics.expected.toFixed(0)}%</span>
                                                <span>{Math.max(20, Math.ceil(actualReturnMetrics.expected * 2))}%</span>
                                            </div>
                                            <div className="mt-1.5 h-2 rounded-full bg-white/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 overflow-hidden">
                                                {(() => {
                                                    const max = Math.max(20, Math.ceil(actualReturnMetrics.expected * 2));
                                                    const cagr = Math.max(0, Math.min(max, actualReturnMetrics.cagr!));
                                                    const pct = (cagr / max) * 100;
                                                    return (
                                                        <div
                                                            className={`h-full ${actualReturnMetrics.onTrack ? 'bg-green-500/70' : 'bg-red-500/70'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                            <div className="mt-2 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                                                {actualReturnMetrics.signal}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {actualReturnMetrics.entries.length > 0 && (
                                    <div className="mt-4 overflow-x-auto no-scrollbar">
                                        <table className="w-full text-[10px]">
                                            <thead>
                                                <tr className="text-gray-400 font-black uppercase tracking-widest">
                                                    <th className="text-left pb-2">연도</th>
                                                    <th className="text-right pb-2">실제(%)</th>
                                                    <th className="text-right pb-2">누적 격차</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200/60 dark:divide-white/10">
                                                {actualReturnMetrics.entries.map((r) => (
                                                    <tr key={r.year} className="text-gray-700 dark:text-gray-200">
                                                        <td className="py-2 font-bold">{String(r.year).slice(2)}년</td>
                                                        <td className="py-2 text-right font-black">{r.actual.toFixed(2)}%</td>
                                                        <td className={`py-2 text-right font-black ${r.vsExpectedPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                            {r.vsExpectedPct >= 0 ? '+' : ''}{r.vsExpectedPct.toFixed(2)}%
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FAB */}
            {viewMode !== 'account' && (
                <button 
                    onClick={() => handleOpenModal()}
                    className="fixed bottom-24 right-5 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40"
                >
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            )}

            {/* Goal Edit Modal */}
            {isGoalModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold dark:text-white">투자 목표 비중 설정</h3>
                            <button onClick={() => setIsGoalModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500 mb-2">각 카테고리별 목표 비율(%)을 입력해 주세요.</p>
                            {localGoals.map((goal, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent dark:border-white/5">
                                    <input 
                                        type="text"
                                        value={goal.category}
                                        onChange={(e) => {
                                            const next = [...localGoals];
                                            next[idx].category = e.target.value;
                                            setLocalGoals(next);
                                        }}
                                        placeholder="카테고리명"
                                        className="w-1/2 bg-transparent border-none text-sm font-bold dark:text-white focus:ring-0 p-0 outline-none"
                                    />
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={goal.targetRatio} 
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const next = [...localGoals];
                                                next[idx].targetRatio = val;
                                                setLocalGoals(next);
                                            }}
                                            className="w-16 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg px-2 py-2 text-center text-sm font-black dark:text-white focus:ring-2 ring-indigo-500 outline-none"
                                        />
                                        <span className="text-xs text-gray-500">%</span>
                                        <button 
                                            onClick={() => {
                                                const next = localGoals.filter((_, i) => i !== idx);
                                                setLocalGoals(next);
                                            }}
                                            className="ml-2 text-red-500 hover:text-red-700 p-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button 
                                onClick={() => setLocalGoals([...localGoals, { category: '', targetRatio: 0 }])}
                                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-zinc-700 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                카테고리 추가
                            </button>
                            <div className="flex justify-between items-center px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl mt-4">
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">합계</span>
                                <span className={`text-base font-black ${localGoals.reduce((a,b) => a + b.targetRatio, 0) === 100 ? 'text-green-600' : 'text-red-500'}`}>
                                    {localGoals.reduce((a,b) => a + b.targetRatio, 0)}%
                                </span>
                            </div>
                        </div>
                        <div className="mt-8">
                            <button 
                                onClick={handleSaveGoals}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform"
                            >
                                목표 저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Investment Entry Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold dark:text-white">{editingItem ? '투자 내역 수정' : '새 종목 추가'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] text-gray-500 font-bold ml-1">카테고리</label>
                                        <button onClick={() => handleOpenInvestmentManage('category')} className="text-[10px] text-blue-500 font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                                    </div>
                                    <select 
                                        value={formData.category} 
                                        onChange={e => setFormData({...formData, category: e.target.value})} 
                                        className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none appearance-none"
                                    >
                                        {finalCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] text-gray-500 font-bold ml-1">계좌 유형</label>
                                        <button onClick={() => handleOpenInvestmentManage('accountType')} className="text-[10px] text-blue-500 font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                                    </div>
                                    <select 
                                        value={formData.accountType} 
                                        onChange={e => {
                                            const newType = e.target.value as AccountType;
                                            const currentAccount = investmentAccounts.find(acc => acc.id === formData.accountId);
                                            setFormData({
                                                ...formData, 
                                                accountType: newType,
                                                accountId: (currentAccount && currentAccount.accountType === newType) ? formData.accountId : ''
                                            });
                                        }} 
                                        className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none appearance-none"
                                    >
                                        {finalAccountTypes.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1">계좌 선택</label>
                                    <select 
                                        value={formData.accountId || ''} 
                                        onChange={e => {
                                            const selectedAccountId = e.target.value;
                                            const selectedAccount = investmentAccounts.find(acc => acc.id === selectedAccountId);
                                            setFormData({
                                                ...formData, 
                                                accountId: selectedAccountId,
                                                accountType: selectedAccount ? selectedAccount.accountType : formData.accountType
                                            });
                                        }} 
                                        className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none appearance-none"
                                    >
                                        <option value="">계좌 선택</option>
                                        {investmentAccounts
                                            .filter(acc => acc.accountType === formData.accountType)
                                            .map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">종목명</label>
                                <input 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none" 
                                    placeholder="예: 삼성전자" 
                                />
                            </div>

                            <div className="flex flex-col">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] text-gray-500 font-bold ml-1">종목코드 (네이버금융 6자리)</label>
                                    <button onClick={() => handleOpenInvestmentManage('stockCode')} className="text-[10px] text-blue-500 font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                                </div>
                                <ComboBox
                                    value={formData.stockCode || ''}
                                    onChange={val => setFormData({...formData, stockCode: val})}
                                    options={finalStockCodes}
                                    placeholder="예: 005930"
                                    className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-mono dark:text-white outline-none"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] text-gray-500 font-bold ml-1">구매처</label>
                                        <button onClick={() => handleOpenInvestmentManage('broker')} className="text-[10px] text-blue-500 font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                                    </div>
                                    <ComboBox
                                        value={formData.broker}
                                        onChange={val => setFormData({...formData, broker: val})}
                                        options={finalBrokers}
                                        placeholder="예: 한국투자"
                                        className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">매수일</label>
                                    <input 
                                        type="date" 
                                        value={formData.date} 
                                        onChange={e => setFormData({...formData, date: e.target.value})} 
                                        className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none appearance-none box-border" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">주당 단가 (매수가)</label>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        value={formData.price ? formData.price.toLocaleString() : ''} 
                                        onChange={e => handleCostInput('price', e.target.value)} 
                                        onBlur={handleAutoCalculateTotal} 
                                        className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50" 
                                        placeholder="0" 
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">매수 수량</label>
                                    <input 
                                        type="number" 
                                        value={formData.quantity} 
                                        onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} 
                                        onBlur={handleAutoCalculateTotal} 
                                        className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50" 
                                        placeholder="0" 
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">총 구매액 (자동 계산)</label>
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.totalCost ? formData.totalCost.toLocaleString() : ''} 
                                    onChange={e => handleCostInput('totalCost', e.target.value)} 
                                    className="w-full h-14 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800/50 rounded-2xl px-5 text-2xl font-black text-indigo-700 dark:text-indigo-300 outline-none" 
                                    placeholder="0" 
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">비고 (메모)</label>
                                <input 
                                    value={formData.note} 
                                    onChange={e => setFormData({...formData, note: e.target.value})} 
                                    className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none border border-transparent focus:border-indigo-500/50" 
                                    placeholder="특이사항 입력" 
                                />
                            </div>

                            {/* 매도 정보 */}
                            <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                                <h4 className="text-xs font-bold text-gray-500 mb-3">매도 정보 (선택)</h4>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">매도일</label>
                                        <input 
                                            type="date" 
                                            value={formData.sellDate || ''} 
                                            onChange={e => setFormData({...formData, sellDate: e.target.value})} 
                                            className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none appearance-none box-border" 
                                        />
                                    </div>
                                    <div></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">매도 수량</label>
                                        <input 
                                            type="number" 
                                            value={formData.soldQuantity || ''} 
                                            onChange={e => {
                                                const sq = parseFloat(e.target.value) || 0;
                                                const sp = formData.soldPrice || 0;
                                                const avgPrice = (formData.totalCost || 0) / (formData.quantity || 1);
                                                const rp = sq * (sp - avgPrice);
                                                setFormData({...formData, soldQuantity: sq, realizedProfit: rp});
                                            }} 
                                            className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50" 
                                            placeholder="0" 
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">매도 단가</label>
                                        <input 
                                            type="text" 
                                            value={formData.soldPrice ? formData.soldPrice.toLocaleString() : ''} 
                                            onChange={e => {
                                                const sp = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                                                const sq = formData.soldQuantity || 0;
                                                const avgPrice = (formData.totalCost || 0) / (formData.quantity || 1);
                                                const rp = sq * (sp - avgPrice);
                                                setFormData({...formData, soldPrice: sp, realizedProfit: rp});
                                            }} 
                                            className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50" 
                                            placeholder="0" 
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">실현 수익</label>
                                    <input 
                                        type="text" 
                                        value={formData.realizedProfit ? formData.realizedProfit.toLocaleString() : ''} 
                                        readOnly
                                        className="w-full h-12 bg-gray-200 dark:bg-white/10 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent cursor-not-allowed" 
                                        placeholder="자동 계산" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            {editingItem && (
                                <button onClick={handleDelete} className="flex-1 py-4 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl font-bold active:scale-95 transition-transform">삭제</button>
                            )}
                            <button onClick={handleSave} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">내역 저장</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Manage Modal */}
            <AnimatePresence>
                {isManageModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md"
                        onClick={() => setIsManageModalOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-3xl overflow-hidden overflow-x-hidden shadow-2xl flex flex-col max-h-[80vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                                <h3 className="text-lg font-bold dark:text-white">
                                    {manageType === 'category' ? '카테고리 관리' : 
                                     manageType === 'accountType' ? '계좌 유형 관리' : 
                                     manageType === 'stockCode' ? '종목 코드 관리' : '구매처 관리'}
                                </h3>
                                <button onClick={() => setIsManageModalOpen(false)} className="text-gray-400 p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon /></button>
                            </div>
                            
                            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex gap-2 shrink-0">
                                <input 
                                    type="text" 
                                    value={newItemName} 
                                    onChange={(e) => setNewItemName(e.target.value)} 
                                    placeholder="새 항목 추가" 
                                    className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 h-[48px] text-sm dark:text-white outline-none focus:border-indigo-500 min-w-0" 
                                />
                                <button onClick={handleAddItem} className="bg-indigo-600 text-white px-5 h-[48px] rounded-xl text-sm font-bold active:scale-95 transition-transform whitespace-nowrap shrink-0">추가</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar bg-gray-50/30 dark:bg-black/20">
                                {manageList.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 text-sm italic">등록된 항목이 없습니다.</div>
                                ) : (
                                    manageList.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between px-4 py-2 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 min-h-[56px] shadow-sm">
                                            {editingIdx === idx ? (
                                                <div className="flex flex-1 items-center gap-2">
                                                    <input 
                                                        value={editingValue} 
                                                        onChange={(e) => setEditingValue(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                                        className="flex-1 h-9 bg-white dark:bg-black border border-indigo-500 rounded-lg px-2 text-sm dark:text-white outline-none min-w-0"
                                                        autoFocus
                                                    />
                                                    <button onClick={handleSaveEdit} className="text-blue-500 p-2 active:scale-90 shrink-0"><CheckIcon /></button>
                                                    <button onClick={() => setEditingIdx(null)} className="text-gray-400 p-2 active:scale-90 shrink-0"><XIcon /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-sm font-medium dark:text-gray-200 truncate pr-4">{item}</span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => handleStartEdit(idx)} className="text-blue-500 opacity-60 hover:opacity-100 p-2 active:scale-90"><EditIcon size={20} /></button>
                                                        <button onClick={() => handleRemoveItem(idx)} className="text-red-500 opacity-60 hover:opacity-100 p-2 active:scale-90"><XIcon size={20} /></button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0 bg-white dark:bg-[#121212]">
                                <button onClick={handleSaveList} disabled={isSavingList} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
                                    {isSavingList ? '데이터 동기화 중...' : '저장'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Account Manage Modal */}
            <AnimatePresence>
                {isAddAccountModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md"
                        onClick={() => setIsAddAccountModalOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                                <h3 className="text-lg font-bold dark:text-white">새 계좌 추가</h3>
                                <button onClick={() => setIsAddAccountModalOpen(false)} className="text-gray-400 p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 no-scrollbar">
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">계좌 종류</label>
                                    <select value={accountFormData.accountType || ''} onChange={e => setAccountFormData({...accountFormData, accountType: e.target.value as any})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50">
                                        <option value="" disabled>선택</option>
                                        {finalAccountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">은행명</label>
                                    <select value={accountFormData.bankName || ''} onChange={e => setAccountFormData({...accountFormData, bankName: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50">
                                        <option value="" disabled>은행 선택</option>
                                        {finalBrokers.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">계좌명</label>
                                    <input type="text" value={accountFormData.accountName || ''} onChange={e => setAccountFormData({...accountFormData, accountName: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50" placeholder="예: ISA 중개형" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">계좌번호</label>
                                    <input type="text" value={accountFormData.accountNumber || ''} onChange={e => setAccountFormData({...accountFormData, accountNumber: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50" placeholder="예: 123-456-789" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">개설일</label>
                                        <input type="date" value={accountFormData.openDate || ''} onChange={e => setAccountFormData({...accountFormData, openDate: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50 appearance-none" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">만기일</label>
                                        <input type="date" value={accountFormData.closeDate || ''} onChange={e => setAccountFormData({...accountFormData, closeDate: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50 appearance-none" />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">납입액 (원금)</label>
                                    <input type="text" value={accountFormData.deposit ? accountFormData.deposit.toLocaleString() : ''} onChange={e => setAccountFormData({...accountFormData, deposit: parseFloat(e.target.value.replace(/,/g, '')) || 0})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50" placeholder="0" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">투자금 (자동맵핑)</label>
                                    <input type="text" value={formatCurrency(investments.filter(inv => inv.accountId === accountFormData.id).reduce((sum, inv) => {
                                        const remainingQuantity = (inv.quantity || 0) - (inv.soldQuantity || 0);
                                        const ratio = inv.quantity > 0 ? remainingQuantity / inv.quantity : 0;
                                        return sum + (inv.totalCost || 0) * ratio;
                                    }, 0))} readOnly className="w-full h-12 bg-gray-200 dark:bg-white/10 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent cursor-not-allowed" />
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 dark:border-white/5">
                                <button onClick={async () => {
                                    await addInvestmentAccount(accountFormData as Omit<import('../types').InvestmentAccount, 'rowIndex'>);
                                    setIsAddAccountModalOpen(false);
                                    setAccountFormData({});
                                    refreshData();
                                }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">저장</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {isEditAccountModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md"
                        onClick={() => setIsEditAccountModalOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-3xl overflow-hidden overflow-x-hidden shadow-2xl flex flex-col max-h-[80vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                                <h3 className="text-lg font-bold dark:text-white">계좌 수정</h3>
                                <button onClick={() => setIsEditAccountModalOpen(false)} className="text-gray-400 p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 no-scrollbar">
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">계좌 종류</label>
                                    <select value={accountFormData.accountType || ''} onChange={e => setAccountFormData({...accountFormData, accountType: e.target.value as any})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50">
                                        <option value="" disabled>선택</option>
                                        {finalAccountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">은행명</label>
                                    <select value={accountFormData.bankName || ''} onChange={e => setAccountFormData({...accountFormData, bankName: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50">
                                        <option value="" disabled>은행 선택</option>
                                        {finalBrokers.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">계좌명</label>
                                    <input type="text" value={accountFormData.accountName || ''} onChange={e => setAccountFormData({...accountFormData, accountName: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50" placeholder="예: ISA 중개형" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">계좌번호</label>
                                    <input type="text" value={accountFormData.accountNumber || ''} onChange={e => setAccountFormData({...accountFormData, accountNumber: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50" placeholder="예: 123-456-789" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">개설일</label>
                                        <input type="date" value={accountFormData.openDate || ''} onChange={e => setAccountFormData({...accountFormData, openDate: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50 appearance-none" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">만기일</label>
                                        <input type="date" value={accountFormData.closeDate || ''} onChange={e => setAccountFormData({...accountFormData, closeDate: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50 appearance-none" />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">납입액 (원금)</label>
                                    <input type="text" value={accountFormData.deposit ? accountFormData.deposit.toLocaleString() : ''} onChange={e => setAccountFormData({...accountFormData, deposit: parseFloat(e.target.value.replace(/,/g, '')) || 0})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500/50" placeholder="0" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-gray-500 mb-1 ml-1 font-bold">투자금 (자동맵핑)</label>
                                    <input type="text" value={formatCurrency(investments.filter(inv => inv.accountId === accountFormData.id).reduce((sum, inv) => {
                                        const remainingQuantity = (inv.quantity || 0) - (inv.soldQuantity || 0);
                                        const ratio = inv.quantity > 0 ? remainingQuantity / inv.quantity : 0;
                                        return sum + (inv.totalCost || 0) * ratio;
                                    }, 0))} readOnly className="w-full h-12 bg-gray-200 dark:bg-white/10 rounded-xl px-4 text-sm font-bold dark:text-white outline-none border border-transparent cursor-not-allowed" />
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 dark:border-white/5">
                                <button onClick={async () => {
                                    await updateInvestmentAccount(accountFormData.rowIndex!, accountFormData as import('../types').InvestmentAccount);
                                    setIsEditAccountModalOpen(false);
                                    setAccountFormData({});
                                    refreshData();
                                }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">수정</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Investments;

```


---

## HTML (settings.tsx)
```html

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    executeSalaryBatch, 
    checkSpreadsheetAccess, 
    requestManualPermission, 
    fillMissingIds, 
    getCurrentSpreadsheetUrl, 
    fetchChecklist, 
    addChecklistItem, 
    updateChecklistItem, 
    deleteChecklistItem, 
    updateBaseDay, 
    fetchAssetPlans, 
    addAssetPlan, 
    updateAssetPlan, 
    deleteAssetPlan, 
    fetchTodoGroups, 
    fetchTodoItems, 
    addTodoGroup, 
    updateTodoGroup, 
    deleteTodoGroup, 
    addTodoItem, 
    updateTodoItem, 
    deleteTodoItem, 
    fetchSalaryTemplate, 
    saveSalaryTemplate,
    updateInvestmentAccountTypes,
    updateInvestmentBrokers,
    updateInvestmentStockCodes,
    updateSetting
} from '../services/googleSheetsService';
import { Theme, AppMode, Tab, ChecklistItem, AssetPlan, TodoGroup, TodoItem, SalaryTemplateItem } from '../types';
import { useUI } from '../contexts/UIContext';
import { generateUniqueId } from '../utils/analysisUtils';

interface SettingsProps {
  theme: Theme;
  toggleTheme: () => void;
  isTestMode: boolean;
  handleLogout: () => void;
  allAccounts: string[];
  managedAccounts: string[];
  refreshData: () => void;
  appMode?: AppMode;
  fourthTab?: Tab;
  setFourthTab?: (tab: Tab) => void;
  baseDay?: number;
  investmentAccountTypes?: string[];
  investmentBrokers?: string[];
  investmentStockCodes?: string[];
}

const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// 공통 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
    <p className="text-xs text-gray-400 font-medium">데이터를 불러오는 중입니다...</p>
  </div>
);

const Settings: React.FC<SettingsProps> = ({ 
    theme, toggleTheme, isTestMode, handleLogout, refreshData, appMode = 'default', fourthTab, setFourthTab, baseDay = 1, allAccounts,
    investmentAccountTypes = [], investmentBrokers = [], investmentStockCodes = []
}) => {
  const { showSnackbar, showConfirm } = useUI();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Modals
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isSubSettingsOpen, setIsSubSettingsOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isEditChecklistOpen, setIsEditChecklistOpen] = useState(false);
  const [isAssetPlansOpen, setIsAssetPlansOpen] = useState(false);
  const [isEditAssetPlanOpen, setIsEditAssetPlanOpen] = useState(false);
  const [isBaseDayModalOpen, setIsBaseDayModalOpen] = useState(false);
  
  // Salary Template Manager
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isEditTemplateItemOpen, setIsEditTemplateItemOpen] = useState(false);
  const [templateType, setTemplateType] = useState<'mouse' | 'horse' | 'gulbi'>('mouse');
  const [templateItems, setTemplateItems] = useState<SalaryTemplateItem[]>([]);
  const [editingTemplateItem, setEditingTemplateItem] = useState<Partial<SalaryTemplateItem> | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);

  // Hierarchical Todo States
  const [isTodoManagerOpen, setIsTodoManagerOpen] = useState(false);
  const [todoStatusTab, setTodoStatusTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [selectedGroup, setSelectedGroup] = useState<TodoGroup | null>(null);
  const [todoGroups, setTodoGroups] = useState<TodoGroup[]>([]);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [isTodoLoading, setIsTodoLoading] = useState(false);
  const [quickTodoInput, setQuickTodoInput] = useState('');

  // Drag state for Base Day Bottom Sheet
  const [baseDayTranslateY, setBaseDayTranslateY] = useState(0);
  const [isDraggingBaseDay, setIsDraggingBaseDay] = useState(false);
  const startYBaseDay = useRef<number>(0);

  const handleBaseDayTouchStart = (e: React.TouchEvent) => {
      startYBaseDay.current = e.touches[0].clientY;
      setIsDraggingBaseDay(true);
  };

  const handleBaseDayTouchMove = (e: React.TouchEvent) => {
      if (!isDraggingBaseDay) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startYBaseDay.current;
      if (diff > 0) setBaseDayTranslateY(diff);
  };

  const handleBaseDayTouchEnd = () => {
      setIsDraggingBaseDay(false);
      if (baseDayTranslateY > 100) {
          setIsBaseDayModalOpen(false);
          setBaseDayTranslateY(0);
      } else {
          setBaseDayTranslateY(0);
      }
  };

  useEffect(() => {
      const isAnyModalOpen = isChecklistOpen || isAssetPlansOpen || isBaseDayModalOpen || isTodoManagerOpen || isTemplateManagerOpen;
      document.body.style.overflow = isAnyModalOpen ? 'hidden' : 'auto';
      return () => { document.body.style.overflow = 'auto'; };
  }, [isChecklistOpen, isAssetPlansOpen, isBaseDayModalOpen, isTodoManagerOpen, isTemplateManagerOpen]);

  // --- Template Manager Handlers ---
  const handleOpenTemplateManager = async (type: 'mouse' | 'horse' | 'gulbi') => {
      setTemplateType(type);
      setIsTemplateLoading(true);
      setIsTemplateManagerOpen(true);
      try {
          const items = await fetchSalaryTemplate(type);
          setTemplateItems(items);
      } catch (e) { showSnackbar('템플릿 로드 실패', 'error'); }
      finally { setIsTemplateLoading(false); }
  };

  const handleOpenEditTemplateItem = (item?: SalaryTemplateItem) => {
      if (item) {
          setEditingTemplateItem({ ...item });
      } else {
          setEditingTemplateItem({ category: '💰수입', subcategory: '', cost: 0, account: allAccounts[0] || '', note: '', settlement: '🟢 완료' });
      }
      setIsEditTemplateItemOpen(true);
  };

  const handleSaveTemplateItem = () => {
      if (!editingTemplateItem?.category || !editingTemplateItem?.subcategory) {
          showSnackbar('분류와 상세분류는 필수입니다.', 'error');
          return;
      }

      const nextItems = [...templateItems];
      const index = editingTemplateItem.rowIndex ? templateItems.findIndex(i => i.rowIndex === editingTemplateItem.rowIndex) : -1;

      if (index !== -1) {
          nextItems[index] = editingTemplateItem as SalaryTemplateItem;
      } else {
          nextItems.push(editingTemplateItem as SalaryTemplateItem);
      }

      setTemplateItems(nextItems);
      setIsEditTemplateItemOpen(false);
      setEditingTemplateItem(null);
  };

  const handleDeleteTemplateItem = () => {
      if (!editingTemplateItem) return;
      const index = editingTemplateItem.rowIndex ? templateItems.findIndex(i => i.rowIndex === editingTemplateItem.rowIndex) : -1;
      if (index !== -1) {
          const nextItems = templateItems.filter((_, i) => i !== index);
          setTemplateItems(nextItems);
      }
      setIsEditTemplateItemOpen(false);
      setEditingTemplateItem(null);
  };

  const handleSaveAllTemplates = async () => {
      if (isTestMode) {
          showSnackbar('[시뮬레이션] 템플릿이 저장되었습니다.', 'success');
          setIsTemplateManagerOpen(false);
          return;
      }
      setIsProcessing(true);
      try {
          await saveSalaryTemplate(templateType, templateItems);
          showSnackbar('템플릿이 저장되었습니다.', 'success');
          setIsTemplateManagerOpen(false);
      } catch (e) { showSnackbar('저장 실패', 'error'); }
      finally { setIsProcessing(false); }
  };

  // --- Hierarchical Todo Handlers ---
  const loadTodoData = async () => {
      setIsTodoLoading(true);
      try {
          const [groups, items] = await Promise.all([fetchTodoGroups(), fetchTodoItems()]);
          setTodoGroups(groups);
          setTodoItems(items);
      } catch (e) { showSnackbar('할일 로드 실패', 'error'); } 
      finally { setIsTodoLoading(false); }
  };

  const classifiedTodoGroups = useMemo(() => {
      const ongoing: TodoGroup[] = [];
      const completed: TodoGroup[] = [];
      
      todoGroups.forEach(group => {
          const items = todoItems.filter(i => i.groupId === group.id);
          const isAllDone = items.length > 0 && items.every(i => i.status === '완료');
          if (isAllDone) completed.push(group);
          else ongoing.push(group);
      });
      
      return { ongoing, completed };
  }, [todoGroups, todoItems]);

  const handleCreateNewGroup = async () => {
      setIsProcessing(true);
      try {
          const newGroup: TodoGroup = {
              id: generateUniqueId(),
              title: '새 주제',
              memo: '',
              date: new Date().toISOString().split('T')[0],
              color: '#3B82F6'
          };
          await addTodoGroup(newGroup);
          await loadTodoData();
          const groups = await fetchTodoGroups();
          if (groups.length > 0) {
              const latest = groups.find(g => g.id === newGroup.id);
              if (latest) setSelectedGroup(latest);
          }
          showSnackbar('새 주제가 생성되었습니다.', 'success');
      } catch (e) { showSnackbar('주제 생성 실패', 'error'); }
      finally { setIsProcessing(false); }
  };

  const handleUpdateGroupInline = async (updatedFields: Partial<TodoGroup>) => {
      if (!selectedGroup || !selectedGroup.rowIndex) return;
      const nextGroup = { ...selectedGroup, ...updatedFields };
      try {
          await updateTodoGroup(selectedGroup.rowIndex, nextGroup);
          setSelectedGroup(nextGroup);
          const groups = await fetchTodoGroups();
          setTodoGroups(groups);
          showSnackbar('저장되었습니다.', 'success');
      } catch (e) { showSnackbar('저장 실패', 'error'); }
  };

  const handleDeleteCurrentGroup = () => {
      if (!selectedGroup || !selectedGroup.rowIndex) return;
      showConfirm(`'${selectedGroup.title}' 주제를 삭제할까요? (관련 할일도 모두 삭제됩니다)`, async () => {
          setIsProcessing(true);
          try {
              await deleteTodoGroup(selectedGroup.rowIndex!, selectedGroup.id);
              setSelectedGroup(null);
              loadTodoData();
              showSnackbar('주제가 삭제되었습니다.', 'success');
          } catch (e) { showSnackbar('삭제 실패', 'error'); }
          finally { setIsProcessing(false); }
      });
  };

  const handleToggleTodoItem = async (item: TodoItem) => {
      if (!item.rowIndex) return;
      const nextStatus = item.status === '완료' ? '대기' : '완료';
      try {
          await updateTodoItem(item.rowIndex, { ...item, status: nextStatus });
          loadTodoData(); 
          showSnackbar(nextStatus === '완료' ? '완료! 🎉' : '다시 대기 중', 'info');
      } catch (e) { showSnackbar('상태 변경 실패', 'error'); }
  };

  const handleUpdateTodoItemName = async (item: TodoItem, newName: string) => {
      const trimmedName = newName.trim();
      if (!item.rowIndex || !trimmedName || item.name === trimmedName) return;
      try {
          await updateTodoItem(item.rowIndex, { ...item, name: trimmedName });
          loadTodoData();
          showSnackbar('수정되었습니다.', 'success');
      } catch (e) { showSnackbar('수정 실패', 'error'); }
  };

  const handleAddQuickTodo = async () => {
      if (!selectedGroup || !quickTodoInput.trim()) return;
      try {
          await addTodoItem({ 
              id: generateUniqueId(), 
              groupId: selectedGroup.id, 
              name: quickTodoInput.trim(), 
              status: '대기', 
              date: new Date().toISOString().split('T')[0] 
          });
          setQuickTodoInput('');
          loadTodoData();
          showSnackbar('추가되었습니다.', 'success');
      } catch (e) { showSnackbar('항목 추가 실패', 'error'); }
  };

  const handleDeleteTodoItem = (rowIndex: number, name: string) => {
      showConfirm(`'${name}' 항목을 삭제하시겠습니까?`, async () => {
          setIsProcessing(true);
          try {
              await deleteTodoItem(rowIndex);
              showSnackbar('삭제되었습니다.', 'success');
              loadTodoData();
          } catch (e) { showSnackbar('삭제 실패', 'error'); }
          finally { setIsProcessing(false); }
      });
  };

  // --- Checklist Handlers ---
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isChecklistLoading, setIsChecklistLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ChecklistItem> | null>(null);

  const loadChecklist = async () => {
      setIsChecklistLoading(true);
      try {
          const data = await fetchChecklist();
          setChecklist(data);
      } catch (e) {
          showSnackbar('체크리스트 로드 실패', 'error');
      } finally {
          setIsChecklistLoading(false);
      }
  };

  const openEditChecklistModal = (item?: ChecklistItem) => {
      if (item) {
          setEditingItem({ ...item });
      } else {
          setEditingItem({
              title: '',
              content: '',
              date: new Date().toISOString().split('T')[0],
              status: '대기'
          });
      }
      setIsEditChecklistOpen(true);
  };

  const handleSaveChecklist = async () => {
      if (!editingItem?.title) {
          showSnackbar('제목을 입력해주세요.', 'error');
          return;
      }
      setIsProcessing(true);
      try {
          if (editingItem.rowIndex) {
              await updateChecklistItem(editingItem.rowIndex, editingItem as ChecklistItem);
              showSnackbar('수정되었습니다.', 'success');
          } else {
              await addChecklistItem({
                  id: generateUniqueId(),
                  title: editingItem.title!,
                  content: editingItem.content || '',
                  date: editingItem.date!,
                  status: editingItem.status as any
              });
              showSnackbar('추가되었습니다.', 'success');
          }
          setIsEditChecklistOpen(false);
          loadChecklist();
      } catch (e) { showSnackbar('저장 실패', 'error'); }
      finally { setIsProcessing(false); }
  };

  const handleDeleteChecklist = async () => {
      if (!editingItem?.rowIndex) return;
      showConfirm(`'${editingItem.title}' 항목을 삭제하시겠습니까?`, async () => {
          setIsProcessing(true);
          try {
              await deleteChecklistItem(editingItem.rowIndex!);
              showSnackbar('삭제되었습니다.', 'success');
              setIsEditChecklistOpen(false);
              loadChecklist();
          } catch (e) { showSnackbar('삭제 실패', 'error'); }
          finally { setIsProcessing(false); }
      });
  };

  // --- Asset Plan Handlers ---
  const [assetPlans, setAssetPlans] = useState<AssetPlan[]>([]);
  const [isAssetPlansLoading, setIsAssetPlansLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<AssetPlan> | null>(null);

  const loadAssetPlans = async () => {
      setIsAssetPlansLoading(true);
      try {
          const data = await fetchAssetPlans();
          setAssetPlans(data);
      } catch (e) {
          showSnackbar('계획 로드 실패', 'error');
      } finally {
          setIsAssetPlansLoading(false);
      }
  };

  const openEditAssetPlanModal = (item?: AssetPlan) => {
      if (item) {
          setEditingPlan({ ...item });
      } else {
          setEditingPlan({
              title: '',
              content: '',
              date: new Date().toISOString().split('T')[0],
              tag: '운영방침'
          });
      }
      setIsEditAssetPlanOpen(true);
  };

  const handleSaveAssetPlan = async () => {
      if (!editingPlan?.title) {
          showSnackbar('제목을 입력해주세요.', 'error');
          return;
      }
      setIsProcessing(true);
      try {
          if (editingPlan.rowIndex) {
              await updateAssetPlan(editingPlan.rowIndex, editingPlan as AssetPlan);
              showSnackbar('수정되었습니다.', 'success');
          } else {
              await addAssetPlan({
                  id: generateUniqueId(),
                  title: editingPlan.title!,
                  content: editingPlan.content || '',
                  date: editingPlan.date!,
                  tag: editingPlan.tag || ''
              });
              showSnackbar('추가되었습니다.', 'success');
          }
          setIsEditAssetPlanOpen(false);
          loadAssetPlans();
      } catch (e) { showSnackbar('저장 실패', 'error'); }
      finally { setIsProcessing(false); }
  };

  const handleDeleteAssetPlan = async () => {
      if (!editingPlan?.rowIndex) return;
      showConfirm(`'${editingPlan.title}' 계획을 삭제하시겠습니까?`, async () => {
          setIsProcessing(true);
          try {
              await deleteAssetPlan(editingPlan.rowIndex!);
              showSnackbar('삭제되었습니다.', 'success');
              setIsEditAssetPlanOpen(false);
              loadAssetPlans();
          } catch (e) { showSnackbar('삭제 실패', 'error'); }
          finally { setIsProcessing(false); }
      });
  };

  // --- Common Handlers ---
  const handleBatchSalary = async (type: 'mouse' | 'horse') => {
     const emoji = type === 'mouse' ? '🐭' : '🐴';
     showConfirm(`${emoji} 급여를 일괄 입력하시겠습니까?`, async () => {
         setIsProcessing(true);
         try {
             const resultMsg = await executeSalaryBatch(type, appMode);
             showSnackbar(resultMsg, 'success'); refreshData();
         } catch(e: any) { showSnackbar('입력 실패: ' + e.message, 'error'); } 
         finally { setIsProcessing(false); }
     });
  };

  const handleSetBaseDay = async (day: number) => {
      setIsProcessing(true);
      try {
          await updateBaseDay(day);
          showSnackbar(`기준일이 ${day}일로 변경되었습니다.`, 'success');
          refreshData(); setIsBaseDayModalOpen(false);
      } catch (e: any) { showSnackbar('저장 실패', 'error'); } 
      finally { setIsProcessing(false); }
  };

  const handleUpdateDateSetting = async (key: string, value: string) => {
      setIsProcessing(true);
      try {
          await updateSetting(key, value);
          showSnackbar('날짜가 저장되었습니다.', 'success');
          refreshData();
      } catch (e: any) { showSnackbar('저장 실패', 'error'); }
      finally { setIsProcessing(false); }
  };

  const checkConnection = async () => {
      if(isTestMode) { showSnackbar('테스트 모드입니다.', 'info'); return; }
      setIsProcessing(true);
      const isConnected = await checkSpreadsheetAccess();
      setIsProcessing(false);
      if(isConnected) showSnackbar('✅ 구글 시트 연결 정상', 'success');
      else showConfirm('권한 확인 불가. 다시 요청하시겠습니까?', () => requestManualPermission());
  };

  const handleFixIds = async () => {
       showConfirm('누락된 고유번호(ID)를 자동으로 생성하시겠습니까?', async () => {
           setIsProcessing(true);
           try { const msg = await fillMissingIds(); showSnackbar(msg, 'success'); refreshData(); } 
           catch(e: any) { showSnackbar('실패: ' + e.message, 'error'); } finally { setIsProcessing(false); }
       });
  };

  const handleTabChange = (tab: Tab) => {
      if (setFourthTab) {
          setFourthTab(tab);
          setIsMenuModalOpen(false);
          showSnackbar('하단 메뉴가 변경되었습니다.', 'success');
      }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">설정</h2>
        
        {isTestMode && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 mb-4 text-yellow-600 dark:text-yellow-200 text-sm">
                🧪 현재 테스트 모드입니다. 데이터는 저장되지 않습니다.
            </div>
        )}

        {isProcessing && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm text-white">
                <div className="bg-zinc-900/80 p-6 rounded-2xl flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-bold">처리 중...</span>
                </div>
            </div>
        )}

        {/* 설정 메인 리스트 */}
        <section className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5 shadow-sm">
            <div className="p-4 flex justify-between items-center" onClick={toggleTheme}>
                <div className="flex flex-col"><span className="font-medium dark:text-white">화면 모드</span><span className="text-xs text-gray-500">{theme === 'dark' ? '다크 모드' : '라이트 모드'}</span></div>
                <button className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} /></button>
            </div>
            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={() => setIsBaseDayModalOpen(true)}>
                <span className="font-medium dark:text-white">기준일 설정</span>
                <div className="flex items-center gap-2"><span className="text-sm font-bold text-blue-500">{baseDay}일</span><span className="text-gray-400">›</span></div>
            </div>
            {appMode === 'gulbi' && (
                <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={() => setIsMenuModalOpen(true)}>
                    <div className="flex flex-col"><span className="font-medium dark:text-white">하단 메뉴 설정</span><span className="text-xs text-gray-500">현재: {fourthTab === Tab.SUBSCRIPTION ? '구독' : '투자'}</span></div>
                    <span className="text-gray-400">›</span>
                </div>
            )}
            <div className="p-4 space-y-3">
                <span className="font-medium dark:text-white block">급여 일괄 입력</span>
                <div className="flex gap-2">
                    {appMode !== 'gulbi' && (
                        <div className="flex-1 flex bg-blue-50 dark:bg-blue-900/30 rounded-xl overflow-hidden border border-blue-100 dark:border-blue-800/30 shadow-sm">
                            <button onClick={() => handleBatchSalary('mouse')} className="flex-1 min-h-[52px] text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold active:bg-blue-100 dark:active:bg-blue-800/50 transition-colors">🐭 급여 입력</button>
                            <div className="w-[1px] bg-blue-200 dark:bg-blue-800/50 my-3" />
                            <button onClick={() => handleOpenTemplateManager('mouse')} className="px-4 text-blue-600 dark:text-blue-400 flex items-center justify-center active:bg-blue-100 dark:active:bg-blue-800/50 transition-colors text-lg">⚙️</button>
                        </div>
                    )}
                    <div className="flex-1 flex bg-green-50 dark:bg-green-900/30 rounded-xl overflow-hidden border border-green-100 dark:border-green-800/30 shadow-sm">
                        <button onClick={() => handleBatchSalary('horse')} className="flex-1 min-h-[52px] text-green-600 dark:text-green-400 rounded-lg text-sm font-bold active:bg-green-100 dark:active:bg-green-800/50 transition-colors">🐴 급여 입력</button>
                        <div className="w-[1px] bg-green-200 dark:bg-green-800/50 my-3" />
                        <button onClick={() => handleOpenTemplateManager('horse')} className="px-4 text-green-600 dark:text-green-400 flex items-center justify-center active:bg-green-100 dark:active:bg-green-800/50 transition-colors text-lg">⚙️</button>
                    </div>
                </div>
            </div>
            <a href={getCurrentSpreadsheetUrl()} target="_blank" rel="noreferrer" className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                <div className="flex flex-col"><span className="font-medium dark:text-white">구글 시트 바로가기</span><span className="text-xs text-blue-500">원본 데이터 직접 수정합니다 ↗</span></div>
                <span className="text-gray-400">›</span>
            </a>
            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={() => { setIsAssetPlansOpen(true); loadAssetPlans(); }}>
                <div className="flex flex-col"><span className="font-medium dark:text-white">자산운영계획</span><span className="text-xs text-gray-500">정산 협의 및 운영 방침</span></div>
                <span className="text-gray-400">›</span>
            </div>
            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={() => { setIsChecklistOpen(true); loadChecklist(); }}>
                <div className="flex flex-col"><span className="font-medium dark:text-white">개발 체크리스트</span><span className="text-xs text-gray-500">기능 현황 및 앱 개발 관리</span></div>
                <span className="text-gray-400">›</span>
            </div>
            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={() => { setIsTodoManagerOpen(true); loadTodoData(); }}>
                <div className="flex flex-col"><span className="font-medium dark:text-white">할일 체크리스트</span><span className="text-xs text-gray-500">주제별 할일 및 체크리스트 관리</span></div>
                <span className="text-gray-400">›</span>
            </div>
            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={() => setIsSubSettingsOpen(true)}>
                <div className="flex flex-col"><span className="font-medium dark:text-white">부가 설정</span><span className="text-xs text-gray-500">고유번호 복구 및 연동 점검</span></div>
                <span className="text-gray-400">›</span>
            </div>
            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5" onClick={handleLogout}>
                <span className="font-medium text-red-500">로그아웃</span><span className="text-gray-400">›</span>
            </div>
        </section>

        <div className="text-center text-[10px] text-gray-400 mt-8 opacity-60 uppercase tracking-widest">
            {appMode === 'gulbi' ? 'Gulbi Account Book' : 'Gulbzzus Account Book'} • v1.8.9
        </div>

        {/* --- MODALS --- */}

        {/* 1. 급여 템플릿 관리 모달 (리스트 뷰) */}
        {isTemplateManagerOpen && (
            <div className="fixed inset-0 z-[200] flex flex-col bg-white dark:bg-black animate-fade-in overflow-hidden max-w-md mx-auto">
                <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10 max-w-md mx-auto">
                    <div className="px-5 py-4 flex items-center">
                        <button onClick={() => setIsTemplateManagerOpen(false)} className="p-2 -ml-2 text-gray-500 hover:text-blue-500 transition-colors z-10">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <h3 className="absolute inset-x-0 text-xl font-bold text-center pointer-events-none dark:text-white">
                            {templateType === 'mouse' ? '🐭' : '🐴'} 급여 템플릿
                        </h3>
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar pt-20 relative bg-gray-50 dark:bg-black divide-y divide-gray-100 dark:divide-white/5">
                    {isTemplateLoading ? (
                        <LoadingSpinner />
                    ) : templateItems.length === 0 ? (
                        <div className="py-32 text-center text-gray-400 italic opacity-60">등록된 템플릿이 없습니다.</div>
                    ) : (
                        templateItems.map((item, idx) => (
                            <div key={idx} onClick={() => handleOpenEditTemplateItem(item)} className="py-4 px-1 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer active:bg-gray-200 dark:active:bg-white/10">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold ${item.category === '💰수입' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>{item.category}</span>
                                        <span className="font-bold dark:text-white text-sm truncate">{item.subcategory}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                        {item.account} • {item.note || '내용 없음'}
                                    </div>
                                </div>
                                <div className={`text-right font-black text-sm ${item.category === '💰수입' ? 'text-blue-500' : 'text-red-500'}`}>
                                    {item.category === '💰수입' ? '+' : '-'}{item.cost.toLocaleString()}원
                                </div>
                            </div>
                        ))
                    )}
                    <div className="h-24" />
                </main>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-black/95 border-t border-gray-100 dark:border-white/10 max-w-md mx-auto flex gap-3">
                    <button onClick={() => handleOpenEditTemplateItem()} className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white rounded-2xl font-bold active:scale-[0.98] transition-all">＋ 항목 추가</button>
                    <button onClick={handleSaveAllTemplates} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">설정 저장</button>
                </div>
            </div>
        )}

        {/* 1-1. 급여 템플릿 상세 편집 팝업 (신규 구현) */}
        {isEditTemplateItemOpen && editingTemplateItem && (
            <div className="fixed inset-0 z-[220] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md animate-fade-in">
                <div className="bg-white dark:bg-[#1c1c1e] w-full max-sm rounded-3xl p-6 shadow-2xl animate-scale-in">
                    <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold dark:text-white">템플릿 편집</h3><button onClick={() => setIsEditTemplateItemOpen(false)} className="text-gray-400 p-2"><XIcon /></button></div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 ml-1">분류</label>
                                <select value={editingTemplateItem.category} onChange={e => setEditingTemplateItem({...editingTemplateItem, category: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl h-12 px-4 text-sm dark:text-white outline-none focus:ring-2 ring-blue-500/20">
                                    <option value="💰수입">💰 수입</option>
                                    <option value="🚨지출">🚨 지출</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 ml-1">상세분류</label>
                                <input value={editingTemplateItem.subcategory} onChange={e => setEditingTemplateItem({...editingTemplateItem, subcategory: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl h-12 px-4 text-sm dark:text-white outline-none focus:ring-2 ring-blue-500/20" placeholder="예: 월급, 통신비" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 ml-1">금액</label>
                            <input type="number" value={editingTemplateItem.cost} onChange={e => setEditingTemplateItem({...editingTemplateItem, cost: parseFloat(e.target.value)})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl h-12 px-4 text-lg font-black dark:text-white outline-none focus:ring-2 ring-blue-500/20" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 ml-1">결제계좌</label>
                            <select value={editingTemplateItem.account} onChange={e => setEditingTemplateItem({...editingTemplateItem, account: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl h-12 px-4 text-sm dark:text-white outline-none focus:ring-2 ring-blue-500/20">
                                {allAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 ml-1">내용 (메모)</label>
                            <input value={editingTemplateItem.note} onChange={e => setEditingTemplateItem({...editingTemplateItem, note: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl h-12 px-4 text-sm dark:text-white outline-none focus:ring-2 ring-blue-500/20" />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={handleDeleteTemplateItem} className="flex-1 py-4 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl font-bold active:scale-95 transition-transform">삭제</button>
                        <button onClick={handleSaveTemplateItem} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">완료</button>
                    </div>
                </div>
            </div>
        )}

        {/* 2. 할일 체크리스트 매니저 (계층형) */}
        {isTodoManagerOpen && (
            <div className="fixed inset-0 z-[200] flex flex-col bg-white dark:bg-black animate-fade-in overflow-hidden max-w-md mx-auto">
                <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10 max-w-md mx-auto">
                    <div className="px-5 py-4 flex items-center">
                        <button onClick={() => selectedGroup ? setSelectedGroup(null) : setIsTodoManagerOpen(false)} className="p-2 -ml-2 text-gray-500 hover:text-blue-500 transition-colors z-10">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <h3 className="absolute inset-x-0 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 text-center pointer-events-none">
                            할일 체크리스트
                        </h3>
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto p-5 space-y-3 no-scrollbar pt-20 relative">
                    {isTodoLoading ? (
                        <LoadingSpinner />
                    ) : !selectedGroup ? (
                        <div className="space-y-4">
                            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                                <button 
                                    onClick={() => setTodoStatusTab('ongoing')}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${todoStatusTab === 'ongoing' ? 'bg-white dark:bg-white/10 shadow text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}
                                >
                                    진행 중 ({classifiedTodoGroups.ongoing.length})
                                </button>
                                <button 
                                    onClick={() => setTodoStatusTab('completed')}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${todoStatusTab === 'completed' ? 'bg-white dark:bg-white/10 shadow text-green-500' : 'text-gray-400'}`}
                                >
                                    완료됨 ({classifiedTodoGroups.completed.length})
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(todoStatusTab === 'ongoing' ? classifiedTodoGroups.ongoing : classifiedTodoGroups.completed).length === 0 ? (
                                    <div className="text-center py-24 text-gray-400 italic opacity-60">목록이 비어있습니다.</div>
                                ) : (todoStatusTab === 'ongoing' ? classifiedTodoGroups.ongoing : classifiedTodoGroups.completed).map(group => {
                                    const items = todoItems.filter(i => i.groupId === group.id);
                                    const doneCount = items.filter(i => i.status === '완료').length;
                                    const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0;
                                    return (
                                        <div key={group.id} onClick={() => setSelectedGroup(group)} className={`bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-4 ${todoStatusTab === 'completed' ? 'opacity-70' : ''}`}>
                                            <div className="flex flex-col items-center justify-center w-10 h-10 bg-white dark:bg-white/10 rounded-lg shrink-0 border border-gray-100 dark:border-white/5">
                                                <span className={`text-[10px] font-bold ${todoStatusTab === 'completed' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>{group.date.slice(5, 7)}</span>
                                                <span className={`text-xs font-bold ${todoStatusTab === 'completed' ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>{group.date.slice(8, 10)}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <h4 className={`font-bold text-gray-900 dark:text-white truncate pr-2 ${todoStatusTab === 'completed' ? 'line-through text-gray-400' : ''}`}>{group.title}</h4>
                                                    <span className={`text-[10px] font-black shrink-0 ${todoStatusTab === 'completed' ? 'text-green-500' : 'text-blue-500'}`}>{doneCount}/{items.length}</span>
                                                </div>
                                                <div className="w-full h-1 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all duration-700 ${todoStatusTab === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="h-20" />
                            <button onClick={handleCreateNewGroup} className="fixed bottom-10 right-5 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-all z-50 shadow-blue-500/20">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        </div>
                    ) : (
                        <div className="animate-fade-in space-y-6 pb-20">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedGroup.date}</span>
                                <button onClick={handleDeleteCurrentGroup} className="text-[10px] text-red-500 font-bold px-2.5 py-1 bg-red-50 dark:bg-red-900/10 rounded-lg active:scale-90 transition-transform">삭제</button>
                            </div>
                            
                            <div className="space-y-3">
                                <input 
                                    className="w-full text-3xl font-black bg-transparent border-none outline-none dark:text-white p-0 focus:ring-0"
                                    value={selectedGroup.title}
                                    onChange={e => setSelectedGroup({...selectedGroup, title: e.target.value})}
                                    onBlur={e => handleUpdateGroupInline({ title: e.target.value })}
                                    onKeyDown={e => { if(e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                    placeholder="주제를 입력하세요"
                                />
                                <textarea 
                                    className="w-full h-16 text-[14px] leading-relaxed bg-transparent border-none outline-none dark:text-gray-300 resize-none p-0 focus:ring-0"
                                    value={selectedGroup.memo}
                                    onChange={e => setSelectedGroup({...selectedGroup, memo: e.target.value})}
                                    onBlur={e => handleUpdateGroupInline({ memo: e.target.value })}
                                    placeholder="상세 설명 (2~3줄 내외)"
                                />
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Items</span>
                                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/5"></div>
                                </div>
                                
                                {todoItems.filter(i => i.groupId === selectedGroup.id).map(item => (
                                    <div key={item.id} className={`flex items-center gap-3 bg-gray-50 dark:bg-zinc-900/50 px-4 py-3 rounded-2xl border transition-all ${item.status === '완료' ? 'opacity-70 border-transparent bg-green-500/10' : 'border-gray-100 dark:border-white/5'}`}>
                                        <button 
                                            onClick={() => handleToggleTodoItem(item)}
                                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${item.status === '완료' ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'bg-white dark:bg-zinc-800 border-gray-300'}`}
                                        >
                                            {item.status === '완료' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                        </button>
                                        <input 
                                            className={`flex-1 min-w-0 bg-transparent border-none outline-none text-[15px] font-bold dark:text-gray-200 px-1 py-1 rounded-lg focus:ring-2 ring-blue-500/20 transition-all ${item.status === '완료' ? 'line-through text-gray-500 opacity-60' : ''}`}
                                            defaultValue={item.name}
                                            onBlur={e => handleUpdateTodoItemName(item, e.target.value)}
                                            onKeyDown={e => { if(e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                            placeholder="항목 이름을 입력하세요"
                                        />
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => item.rowIndex && handleDeleteTodoItem(item.rowIndex, item.name)} className="p-2 text-red-500/40 hover:text-red-500 active:scale-90 transition-all">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="mt-4 flex gap-2">
                                    <input 
                                        className="flex-1 bg-gray-100 dark:bg-zinc-800 border-none rounded-xl px-4 h-12 text-sm font-bold dark:text-white outline-none focus:ring-2 ring-blue-500/20"
                                        placeholder="새 할일 추가..."
                                        value={quickTodoInput}
                                        onChange={e => setQuickTodoInput(e.target.value)}
                                        onKeyDown={e => { if(e.key === 'Enter') handleAddQuickTodo(); }}
                                    />
                                    <button onClick={handleAddQuickTodo} className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold active:scale-90 transition-transform">＋</button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        )}

        {/* 3. 개발 체크리스트 모달 */}
        {isChecklistOpen && (
            <div className="fixed inset-0 z-[200] flex flex-col bg-white dark:bg-black animate-fade-in overflow-hidden max-w-md mx-auto">
                <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10 max-w-md mx-auto">
                    <div className="px-5 py-4 flex items-center">
                        <button onClick={() => setIsChecklistOpen(false)} className="p-2 -ml-2 text-gray-500 hover:text-blue-500 transition-colors z-10">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <h3 className="absolute inset-x-0 text-xl font-bold text-center pointer-events-none dark:text-white">개발 체크리스트</h3>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-5 space-y-3 pt-20 no-scrollbar">
                    {isChecklistLoading ? (
                        <LoadingSpinner />
                    ) : checklist.length === 0 ? (
                        <div className="text-center py-24 text-gray-400 italic">등록된 항목이 없습니다.</div>
                    ) : (
                        checklist.map(item => (
                            <div key={item.id} onClick={() => openEditChecklistModal(item)} className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 flex items-center gap-4 cursor-pointer active:scale-95 transition-all">
                                <div className="flex flex-col items-center justify-center w-10 h-10 bg-white dark:bg-white/5 rounded-lg shrink-0 border border-gray-100 dark:border-white/5">
                                    <span className="text-[10px] font-bold text-gray-500">{item.date.slice(5, 7)}</span>
                                    <span className="text-xs font-bold text-gray-400">{item.date.slice(8, 10)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold dark:text-white truncate pr-2">{item.title}</h4>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                                            item.status === '완료' ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30' : 
                                            item.status === '진행' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30' :
                                            item.status === '대기' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30' :
                                            'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    <div className="h-20" />
                    <button onClick={() => openEditChecklistModal()} className="fixed bottom-10 right-5 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center z-50 active:scale-90 transition-all shadow-blue-500/20">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </main>
            </div>
        )}

        {/* 3-1. 개발 체크리스트 상세 편집 팝업 (복구됨) */}
        {isEditChecklistOpen && editingItem && (
            <div className="fixed inset-0 z-[220] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md animate-fade-in">
                <div className="bg-white dark:bg-[#1e1e1e] w-full max-sm rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold dark:text-white">{editingItem.rowIndex ? '항목 수정' : '새 항목 추가'}</h3>
                        <button onClick={() => setIsEditChecklistOpen(false)} className="text-gray-400 p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon /></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase">제목</label>
                            <input value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none focus:ring-2 ring-blue-500 transition-all" placeholder="구현할 기능을 입력하세요" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase">상세 내용</label>
                            <textarea value={editingItem.content} onChange={e => setEditingItem({...editingItem, content: e.target.value})} className="w-full h-24 bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 ring-blue-500 transition-all resize-none" placeholder="구체적인 내용을 입력하세요" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase">날짜</label>
                                <input type="date" value={editingItem.date} onChange={e => setEditingItem({...editingItem, date: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none appearance-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase">상태</label>
                                <select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value as any})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none">
                                    <option value="대기">🟠 대기</option>
                                    <option value="진행">🔵 진행</option>
                                    <option value="완료">🟢 완료</option>
                                    <option value="보류">⚪️ 보류</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        {editingItem.rowIndex && (
                            <button onClick={handleDeleteChecklist} className="flex-1 py-4 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl font-bold active:scale-95 transition-transform">삭제</button>
                        )}
                        <button onClick={handleSaveChecklist} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">저장하기</button>
                    </div>
                </div>
            </div>
        )}

        {/* 4. 자산운영계획 모달 */}
        {isAssetPlansOpen && (
            <div className="fixed inset-0 z-[200] flex flex-col bg-white dark:bg-black animate-fade-in overflow-hidden max-w-md mx-auto">
                <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10 max-w-md mx-auto">
                    <div className="px-5 py-4 flex items-center">
                        <button onClick={() => setIsAssetPlansOpen(false)} className="p-2 -ml-2 text-gray-500 hover:text-blue-500 transition-colors z-10">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <h3 className="absolute inset-x-0 text-xl font-bold text-center pointer-events-none dark:text-white">자산운영계획</h3>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-5 space-y-3 pt-20 no-scrollbar">
                    {isAssetPlansLoading ? (
                        <LoadingSpinner />
                    ) : assetPlans.length === 0 ? (
                        <div className="text-center py-24 text-gray-400 italic">등록된 계획이 없습니다.</div>
                    ) : (
                        assetPlans.map(item => (
                            <div key={item.id} onClick={() => openEditAssetPlanModal(item)} className="bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-4">
                                <div className="flex flex-col items-center justify-center w-10 h-10 bg-white dark:bg-white/10 rounded-lg shrink-0 border border-gray-100 dark:border-white/5">
                                    <span className="text-[10px] font-bold text-gray-500">{item.date.slice(5, 7)}</span>
                                    <span className="text-xs font-bold text-gray-400">{item.date.slice(8, 10)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold dark:text-white truncate pr-2">{item.title}</h4>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 dark:text-gray-400 shrink-0">#{item.tag}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{item.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    <div className="h-20" />
                    <button onClick={() => openEditAssetPlanModal()} className="fixed bottom-10 right-5 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center z-50 active:scale-90 transition-all shadow-blue-500/20">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </main>
            </div>
        )}

        {/* 4-1. 자산운영계획 상세 편집 팝업 (복구됨) */}
        {isEditAssetPlanOpen && editingPlan && (
            <div className="fixed inset-0 z-[220] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md animate-fade-in">
                <div className="bg-white dark:bg-[#1e1e1e] w-full max-sm rounded-3xl p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold dark:text-white">{editingPlan.rowIndex ? '계획 수정' : '새 계획 추가'}</h3>
                        <button onClick={() => setIsEditAssetPlanOpen(false)} className="text-gray-400 p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon /></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase">제목</label>
                            <input value={editingPlan.title} onChange={e => setEditingPlan({...editingPlan, title: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm font-bold dark:text-white outline-none focus:ring-2 ring-blue-500 transition-all" placeholder="계획의 핵심 제목을 입력하세요" />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase">상세 협의 내용</label>
                            <textarea value={editingPlan.content} onChange={e => setEditingPlan({...editingPlan, content: e.target.value})} className="w-full h-32 bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-3 text-sm dark:text-white outline-none focus:ring-2 ring-blue-500 transition-all resize-none" placeholder="운영 정책이나 협의된 세부 내용을 상세히 기록하세요" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase">날짜</label>
                                <input type="date" value={editingPlan.date} onChange={e => setEditingPlan({...editingPlan, date: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none appearance-none" />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold ml-1 mb-1 block uppercase">태그</label>
                                <input value={editingPlan.tag} onChange={e => setEditingPlan({...editingPlan, tag: e.target.value})} className="w-full h-12 bg-gray-100 dark:bg-white/5 rounded-xl px-4 text-sm dark:text-white outline-none focus:ring-2 ring-blue-500 transition-all" placeholder="예: 운영방침" />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        {editingPlan.rowIndex && (
                            <button onClick={handleDeleteAssetPlan} className="flex-1 py-4 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl font-bold active:scale-95 transition-transform">삭제</button>
                        )}
                        <button onClick={handleSaveAssetPlan} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">저장하기</button>
                    </div>
                </div>
            </div>
        )}

        {/* 5. 기준일 설정 버텀시트 */}
        {isBaseDayModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-end justify-center pointer-events-none animate-fade-in" onClick={() => setIsBaseDayModalOpen(false)}>
                <div 
                    className="bg-white dark:bg-[#1c1c1e] w-full max-md rounded-t-[2.5rem] overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[70vh] border-t border-gray-200 dark:border-white/10 pointer-events-auto transition-transform duration-200 ease-out" 
                    onClick={e => e.stopPropagation()}
                    style={{ transform: `translateY(${baseDayTranslateY}px)`, transition: isDraggingBaseDay ? 'none' : 'transform 0.2s ease-out' }}
                >
                    <div 
                        className="w-full flex justify-center py-5 shrink-0 cursor-grab active:cursor-grabbing touch-none"
                        onTouchStart={handleBaseDayTouchStart}
                        onTouchMove={handleBaseDayTouchMove}
                        onTouchEnd={handleBaseDayTouchEnd}
                    >
                        <div className="w-14 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full"></div>
                    </div>
                    <div className="px-6 pb-6 pt-0 text-center">
                        <h3 className="text-xl font-black mb-1 dark:text-white">기준일 선택</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">통계 계산의 시작일을 정해주세요</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-7 gap-1.5 no-scrollbar pb-10">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <button 
                                key={day} 
                                onClick={() => handleSetBaseDay(day)}
                                className={`aspect-square rounded-xl flex items-center justify-center font-bold text-base transition-all ${baseDay === day ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* 6. 부가 설정 모달 */}
        {isSubSettingsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsSubSettingsOpen(false)}>
                <div className="bg-white dark:bg-[#1c1c1e] w-full max-sm rounded-3xl p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold dark:text-white">부가 설정</h3>
                        <button onClick={() => setIsSubSettingsOpen(false)} className="text-gray-400 p-1"><XIcon /></button>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                            <span className="text-[10px] font-black text-indigo-500 block mb-2 uppercase tracking-tight">데이터 정합성</span>
                            <button onClick={handleFixIds} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-md">🆔 고유번호(ID) 복구</button>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-200 dark:border-zinc-700/50">
                            <span className="text-[10px] font-black text-gray-500 block mb-2 uppercase tracking-tight">연동 점검</span>
                            <div className="flex gap-2">
                                <button onClick={checkConnection} className="flex-1 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold dark:text-white active:scale-95 transition-transform">📡 상태 점검</button>
                                <button onClick={requestManualPermission} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform">🔐 권한 재승인</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* 7. 하단 메뉴 설정 모달 */}
        {isMenuModalOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsMenuModalOpen(false)}>
                <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold mb-4 dark:text-white">하단 메뉴 설정</h3>
                    <p className="text-sm text-gray-500 mb-6">네 번째 탭의 기능을 변경합니다.</p>
                    <div className="space-y-3">
                        <button onClick={() => handleTabChange(Tab.SUBSCRIPTION)} className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${fourthTab === Tab.SUBSCRIPTION ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-white/10'}`}>
                            <span className={`font-bold ${fourthTab === Tab.SUBSCRIPTION ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>구독 관리</span>
                            {fourthTab === Tab.SUBSCRIPTION && <span className="text-blue-500">✓</span>}
                        </button>
                        <button onClick={() => handleTabChange(Tab.INVESTMENT)} className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${fourthTab === Tab.INVESTMENT ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-white/10'}`}>
                            <span className={`font-bold ${fourthTab === Tab.INVESTMENT ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`}>투자 관리</span>
                            {fourthTab === Tab.INVESTMENT && <span className="text-indigo-500">✓</span>}
                        </button>
                    </div>
                    <button onClick={() => setIsMenuModalOpen(false)} className="w-full mt-6 py-3 text-sm font-medium text-gray-500">닫기</button>
                </div>
             </div>
        )}
    </div>
  );
};

export default Settings;

```


---

## HTML (subscriptions.tsx)
```html

import React, { useState, useMemo } from 'react';
import { Subscription } from '../types';
import { RENEWAL_CYCLES } from '../constants';
import { addSubscription, updateSubscription, deleteSubscription, updateSubscriptionTags, updateAccounts } from '../services/googleSheetsService';
import { useUI } from '../contexts/UIContext';
import { formatCurrency, generateUniqueId } from '../utils/analysisUtils';

interface SubscriptionsProps {
    subscriptions: Subscription[];
    accounts: string[];
    subscriptionTags: string[];
    refreshData: () => void;
}

// --- Icons ---
const EditIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const Subscriptions: React.FC<SubscriptionsProps> = ({ subscriptions, accounts, subscriptionTags, refreshData }) => {
    const { showSnackbar, showConfirm } = useUI();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeStatusTab, setActiveStatusTab] = useState<'구독' | '해지'>('구독');
    const [sortMode, setSortMode] = useState<'amount' | 'newest'>('newest');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSub, setEditingSub] = useState<Subscription | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Subscription>>({
        name: '', cost: 0, cycle: RENEWAL_CYCLES[0], paymentMethod: accounts[0] || '', startDate: new Date().toISOString().split('T')[0], tag: subscriptionTags[0] || '', memo: '', status: '구독'
    });

    // Tag Management Modal State
    const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
    const [tempTags, setTempTags] = useState<string[]>([]);
    const [newTagName, setNewTagName] = useState('');
    const [isSavingTags, setIsSavingTags] = useState(false);
    
    // Inline Tag Editing State
    const [editingTagIdx, setEditingTagIdx] = useState<number | null>(null);
    const [editingTagValue, setEditingTagValue] = useState('');
    const [tagRenameMap, setTagRenameMap] = useState<Record<string, string>>({});

    // Account Management Modal State
    const [isManageAccountsOpen, setIsManageAccountsOpen] = useState(false);
    const [tempAccounts, setTempAccounts] = useState<string[]>([]);
    const [newAccountName, setNewAccountName] = useState('');
    const [isSavingAccounts, setIsSavingAccounts] = useState(false);
    const [editingAccIdx, setEditingAccIdx] = useState<number | null>(null);
    const [editingAccValue, setEditingAccValue] = useState('');
    const [accRenameMap, setAccRenameMap] = useState<Record<string, string>>({});

    const filteredList = useMemo(() => {
        let list = [...subscriptions].filter(s => 
            (s.status === activeStatusTab) &&
            (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             s.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.memo.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (sortMode === 'amount') {
            list.sort((a, b) => b.cost - a.cost);
        } else {
            list.sort((a, b) => (b.rowIndex || 0) - (a.rowIndex || 0));
        }
        return list;
    }, [subscriptions, searchTerm, sortMode, activeStatusTab]);

    const { totalMonthly, totalAnnual } = useMemo(() => {
        let monthly = 0;
        subscriptions.filter(s => s.status === '구독').forEach(sub => {
            const cost = sub.cost || 0;
            let subMonthly = 0;
            if (sub.cycle === '매월') subMonthly = cost;
            else if (sub.cycle === '매년') subMonthly = cost / 12;
            else if (sub.cycle === '분기별') subMonthly = cost / 3;
            else if (sub.cycle === '매주') subMonthly = cost * 4;
            else subMonthly = cost;
            monthly += subMonthly;
        });
        return { totalMonthly: Math.round(monthly), totalAnnual: Math.round(monthly * 12) };
    }, [subscriptions]);

    const handleOpenModal = (sub?: Subscription) => {
        if (sub) {
            setEditingSub(sub);
            setFormData({ ...sub });
        } else {
            setEditingSub(null);
            setFormData({
                name: '', cost: 0, cycle: RENEWAL_CYCLES[0], paymentMethod: accounts[0] || '', startDate: new Date().toISOString().split('T')[0], tag: subscriptionTags[0] || '', memo: '', status: '구독'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || formData.cost === undefined || isNaN(formData.cost)) {
            showSnackbar('구독명과 금액은 필수입니다.', 'error');
            return;
        }

        try {
            if (editingSub && editingSub.rowIndex) {
                await updateSubscription(editingSub.rowIndex, { ...editingSub, ...formData } as Subscription);
                showSnackbar('수정되었습니다.', 'success');
            } else {
                await addSubscription({
                    id: generateUniqueId(),
                    name: formData.name!,
                    cost: formData.cost!,
                    cycle: formData.cycle!,
                    paymentMethod: formData.paymentMethod!,
                    startDate: formData.startDate!,
                    tag: formData.tag!,
                    memo: formData.memo || '',
                    status: formData.status as any || '구독'
                });
                showSnackbar('추가되었습니다.', 'success');
            }
            setIsModalOpen(false);
            refreshData();
        } catch (e) {
            showSnackbar('저장 실패', 'error');
        }
    };

    const handleDelete = async () => {
        if (!editingSub || !editingSub.rowIndex) return;
        showConfirm(`'${editingSub.name}' 구독 정보를 완전히 삭제하시겠습니까?\n(해지만 하려면 상태를 해지로 변경하세요)`, async () => {
            try {
                await deleteSubscription(editingSub.rowIndex!);
                showSnackbar('삭제되었습니다.', 'success');
                setIsModalOpen(false);
                refreshData();
            } catch (e) {
                showSnackbar('삭제 실패', 'error');
            }
        });
    };

    // --- Tag Manage Handlers ---
    const handleOpenManageTags = () => {
        setTempTags([...subscriptionTags]);
        setNewTagName('');
        setEditingTagIdx(null);
        setTagRenameMap({});
        setIsManageTagsOpen(true);
    };

    const handleAddTag = () => {
        if (!newTagName.trim()) return;
        if (tempTags.includes(newTagName.trim())) {
            showSnackbar('이미 존재하는 태그입니다.', 'error');
            return;
        }
        setTempTags([...tempTags, newTagName.trim()]);
        setNewTagName('');
    };

    const handleStartTagEdit = (idx: number) => {
        setEditingTagIdx(idx);
        setEditingTagValue(tempTags[idx]);
    };

    const handleSaveTagEdit = () => {
        if (editingTagIdx === null || !editingTagValue.trim()) return;
        const oldName = tempTags[editingTagIdx];
        const newName = editingTagValue.trim();

        if (oldName === newName) {
            setEditingTagIdx(null);
            return;
        }

        const nextTags = [...tempTags];
        nextTags[editingTagIdx] = newName;
        setTempTags(nextTags);
        setTagRenameMap(prev => ({ ...prev, [oldName]: newName }));
        setEditingTagIdx(null);
    };

    const handleRemoveTag = (index: number) => {
        showConfirm(`'${tempTags[index]}' 태그를 삭제하시겠습니까?`, () => {
            setTempTags(tempTags.filter((_, i) => i !== index));
            if (editingTagIdx === index) setEditingTagIdx(null);
        });
    };

    const handleSaveTags = async () => {
        setIsSavingTags(true);
        try {
            await updateSubscriptionTags(tempTags, tagRenameMap);
            showSnackbar('태그 리스트 및 기존 구독 정보가 업데이트되었습니다.', 'success');
            refreshData();
            setIsManageTagsOpen(false);
        } catch (e: any) {
            showSnackbar(e.message, 'error');
        } finally {
            setIsSavingTags(false);
        }
    };

    // --- Account Manage Handlers ---
    const handleOpenManageAccounts = () => {
        setTempAccounts([...accounts]);
        setNewAccountName('');
        setEditingAccIdx(null);
        setAccRenameMap({});
        setIsManageAccountsOpen(true);
    };

    const handleAddAccount = () => {
        if (!newAccountName.trim()) return;
        if (tempAccounts.includes(newAccountName.trim())) {
            showSnackbar('이미 존재하는 항목입니다.', 'error');
            return;
        }
        setTempAccounts([...tempAccounts, newAccountName.trim()]);
        setNewAccountName('');
    };

    const handleStartAccEdit = (idx: number) => {
        setEditingAccIdx(idx);
        setEditingAccValue(tempAccounts[idx]);
    };

    const handleSaveAccEdit = () => {
        if (editingAccIdx === null || !editingAccValue.trim()) return;
        const oldName = tempAccounts[editingAccIdx];
        const newName = editingAccValue.trim();
        if (oldName === newName) {
            setEditingAccIdx(null);
            return;
        }
        const next = [...tempAccounts];
        next[editingAccIdx] = newName;
        setTempAccounts(next);
        setAccRenameMap(prev => ({ ...prev, [oldName]: newName }));
        setEditingAccIdx(null);
    };

    const handleRemoveAccount = (index: number) => {
        showConfirm(`'${tempAccounts[index]}' 항목을 삭제하시겠습니까?`, () => {
            setTempAccounts(tempAccounts.filter((_, i) => i !== index));
            if (editingAccIdx === index) setEditingAccIdx(null);
        });
    };

    const handleSaveAccounts = async () => {
        setIsSavingAccounts(true);
        try {
            await updateAccounts(tempAccounts, accRenameMap);
            showSnackbar('결제수단 리스트 및 관련 정보가 업데이트되었습니다.', 'success');
            refreshData();
            setIsManageAccountsOpen(false);
        } catch (e: any) {
            showSnackbar(e.message, 'error');
        } finally {
            setIsSavingAccounts(false);
        }
    };

    return (
        <div className="pb-24 animate-fade-in min-h-screen relative">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 -mx-5 px-5 pt-4 pb-8 mb-4 shadow-lg shadow-blue-900/20 text-white">
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                        <div className="text-[10px] opacity-70 uppercase tracking-wider font-bold">구독 지출 합계 (진행중)</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black">{formatCurrency(totalMonthly)}</span>
                            <span className="text-xs opacity-60">/ 월평균</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-black opacity-90">{formatCurrency(totalAnnual)}</span>
                            <span className="text-[10px] opacity-50">/ 연간합계</span>
                        </div>
                    </div>
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20" strokeLinecap="round"/><circle cx="12" cy="12" r="3" /></svg>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-xs">🔍</span>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="구독명, 태그 검색" className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-white/40 rounded-xl py-2.5 pl-9 pr-4 text-xs outline-none focus:bg-white/20 transition-all border border-white/5" />
                    </div>
                    <button onClick={() => setSortMode(sortMode === 'amount' ? 'newest' : 'amount')} className="bg-white/10 text-white border border-white/5 px-4 py-2 rounded-xl text-[11px] font-bold">
                        {sortMode === 'amount' ? '금액순' : '최신순'}
                    </button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl mb-4 mx-1">
                <button 
                    onClick={() => setActiveStatusTab('구독')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeStatusTab === '구독' ? 'bg-white dark:bg-white/10 shadow text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}
                >
                    구독 ({subscriptions.filter(s => s.status === '구독').length})
                </button>
                <button 
                    onClick={() => setActiveStatusTab('해지')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeStatusTab === '해지' ? 'bg-white dark:bg-white/10 shadow text-red-500' : 'text-gray-400'}`}
                >
                    해지 ({subscriptions.filter(s => s.status === '해지').length})
                </button>
            </div>

            {/* Divider Style List - Updated Date Display to match History */}
            <div className="mt-2 divide-y divide-gray-100 dark:divide-white/5 px-1">
                {filteredList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400 opacity-60">
                        <div className="text-5xl mb-4">📦</div>
                        <p className="text-sm font-medium">내역이 없습니다.</p>
                    </div>
                ) : (
                    filteredList.map((sub) => (
                        <div 
                            key={sub.id} 
                            onClick={() => handleOpenModal(sub)} 
                            className="flex items-center justify-between py-4 px-1 transition-colors cursor-pointer active:bg-gray-50 dark:active:bg-white/5"
                        >
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-lg shrink-0">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{sub.startDate.slice(5, 7)}</span>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{sub.startDate.slice(8, 10)}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-1 min-w-0">
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold border shrink-0 ${
                                            sub.status === '구독' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20'
                                        }`}>
                                            {sub.status}
                                        </span>
                                        <div className="font-bold text-gray-900 dark:text-white text-[15px] truncate">
                                            {sub.name}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden">
                                        <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/30 shrink-0">
                                            {sub.tag}
                                        </span>
                                        <span className="font-medium shrink-0">{sub.paymentMethod}</span>
                                        <span className="opacity-30 shrink-0">•</span>
                                        <span className="truncate">{sub.cycle}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                                <div className={`font-black text-[15px] ${activeStatusTab === '구독' ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'}`}>
                                    {formatCurrency(sub.cost)}
                                </div>
                                {sub.memo && <div className="text-[10px] text-gray-400 mt-1 truncate max-w-[80px]">{sub.memo}</div>}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button onClick={() => handleOpenModal()} className="fixed bottom-24 right-5 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>

            {/* Edit Modal - Preserved Original UI Style */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-white dark:bg-[#1c1c1e] w-full max-sm rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold dark:text-white">{editingSub ? '구독 정보 수정' : '새 구독 추가'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/5 transition-colors"><XIcon /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1 ml-1 font-bold">서비스 상태</label>
                                <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1">
                                    <button onClick={() => setFormData({...formData, status: '구독'})} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.status === '구독' ? 'bg-white dark:bg-white/10 shadow text-blue-600' : 'text-gray-400'}`}>구독</button>
                                    <button onClick={() => setFormData({...formData, status: '해지'})} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.status === '해지' ? 'bg-white dark:bg-white/10 shadow text-red-500' : 'text-gray-400'}`}>해지</button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 block mb-1 ml-1 font-bold">서비스명</label>
                                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-2 text-sm dark:text-white h-12 outline-none focus:ring-2 ring-blue-500/20" placeholder="예: 넷플릭스" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1 ml-1 font-bold">금액</label>
                                    <input type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: parseInt(e.target.value)})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-2 text-sm dark:text-white h-12 outline-none font-bold" placeholder="0" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1 ml-1 font-bold">갱신주기</label>
                                    <select value={formData.cycle} onChange={e => setFormData({...formData, cycle: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-2 text-sm dark:text-white h-12 outline-none">
                                        {RENEWAL_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1 ml-1">
                                        <label className="text-xs text-gray-500 font-bold">태그</label>
                                        <button onClick={(e) => { e.preventDefault(); handleOpenManageTags(); }} className="text-[10px] text-blue-500 font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                                    </div>
                                    <select value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-2 text-sm dark:text-white h-12 outline-none">
                                        {subscriptionTags.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1 ml-1">
                                        <label className="text-xs text-gray-500 font-bold">결제수단</label>
                                        <button onClick={(e) => { e.preventDefault(); handleOpenManageAccounts(); }} className="text-[10px] text-blue-500 font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 active:scale-95 transition-transform">편집</button>
                                    </div>
                                    <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-2 text-sm dark:text-white h-12 outline-none">
                                        {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-500 block mb-1 ml-1 font-bold">시작일</label>
                                <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-2 text-sm dark:text-white h-12 outline-none appearance-none" />
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-500 block mb-1 ml-1 font-bold">메모</label>
                                <input value={formData.memo} onChange={e => setFormData({...formData, memo: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 rounded-xl px-4 py-2 text-sm dark:text-white h-12 outline-none" placeholder="추가 정보 입력" />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            {editingSub && (
                                <button onClick={handleDelete} className="flex-1 py-4 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl font-bold active:scale-95 transition-transform">삭제</button>
                            )}
                            <button onClick={handleSave} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">저장하기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tag Management Modal */}
            {isManageTagsOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold dark:text-white">구독 태그 관리</h3>
                            <button onClick={() => setIsManageTagsOpen(false)} className="text-gray-400 p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon /></button>
                        </div>
                        
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex gap-2 shrink-0">
                            <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="새 태그 추가" className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 h-[48px] text-sm dark:text-white outline-none focus:border-blue-500 min-w-0" />
                            <button onClick={handleAddTag} className="bg-blue-600 text-white px-5 h-[48px] rounded-xl text-sm font-bold active:scale-95 transition-transform whitespace-nowrap shrink-0">추가</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar bg-gray-50/30 dark:bg-black/20">
                            {tempTags.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm italic">등록된 태그가 없습니다.</div>
                            ) : (
                                tempTags.map((tag, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-4 py-2 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 min-h-[56px] shadow-sm">
                                        {editingTagIdx === idx ? (
                                            <div className="flex flex-1 items-center gap-2">
                                                <input value={editingTagValue} onChange={(e) => setEditingTagValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveTagEdit()} className="flex-1 h-9 bg-white dark:bg-black border border-blue-500 rounded-lg px-2 text-sm dark:text-white outline-none min-w-0" autoFocus />
                                                <button onClick={handleSaveTagEdit} className="text-blue-500 p-2 active:scale-90 shrink-0"><CheckIcon /></button>
                                                <button onClick={() => setEditingTagIdx(null)} className="text-gray-400 p-2 active:scale-90 shrink-0"><XIcon /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-sm font-medium dark:text-gray-200 truncate pr-4">{tag}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={() => handleStartTagEdit(idx)} className="text-blue-500 opacity-60 hover:opacity-100 p-2 active:scale-90"><EditIcon /></button>
                                                    <button onClick={() => handleRemoveTag(idx)} className="text-red-500 opacity-60 hover:opacity-100 p-2 active:scale-90"><XIcon /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0 bg-white dark:bg-[#121212]">
                            <button onClick={handleSaveTags} disabled={isSavingTags} className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
                                {isSavingTags ? '저장 중...' : '저장 (구글 시트 반영)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Management Modal */}
            {isManageAccountsOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold dark:text-white">결제수단 관리</h3>
                            <button onClick={() => setIsManageAccountsOpen(false)} className="text-gray-400 p-2 hover:bg-white/10 rounded-full transition-colors"><XIcon /></button>
                        </div>
                        
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex gap-2 shrink-0">
                            <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="새 결제수단 추가" className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 h-[48px] text-sm dark:text-white outline-none focus:border-blue-500 min-w-0" />
                            <button onClick={handleAddAccount} className="bg-blue-600 text-white px-5 h-[48px] rounded-xl text-sm font-bold active:scale-95 transition-transform whitespace-nowrap shrink-0">추가</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar bg-gray-50/30 dark:bg-black/20">
                            {tempAccounts.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm italic">등록된 결제수단이 없습니다.</div>
                            ) : (
                                tempAccounts.map((acc, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-4 py-2 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 min-h-[56px] shadow-sm">
                                        {editingAccIdx === idx ? (
                                            <div className="flex flex-1 items-center gap-2">
                                                <input value={editingAccValue} onChange={(e) => setEditingAccValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveAccEdit()} className="flex-1 h-9 bg-white dark:bg-black border border-blue-500 rounded-lg px-2 text-sm dark:text-white outline-none min-w-0" autoFocus />
                                                <button onClick={handleSaveAccEdit} className="text-blue-500 p-2 active:scale-90 shrink-0"><CheckIcon /></button>
                                                <button onClick={() => setEditingAccIdx(null)} className="text-gray-400 p-2 active:scale-90 shrink-0"><XIcon /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-sm font-medium dark:text-gray-200 truncate pr-4">{acc}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={() => handleStartAccEdit(idx)} className="text-blue-500 opacity-60 hover:opacity-100 p-2 active:scale-90"><EditIcon /></button>
                                                    <button onClick={() => handleRemoveAccount(idx)} className="text-red-500 opacity-60 hover:opacity-100 p-2 active:scale-90"><XIcon /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0 bg-white dark:bg-[#121212]">
                            <button onClick={handleSaveAccounts} disabled={isSavingAccounts} className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
                                {isSavingAccounts ? '저장 중...' : '저장 (구글 시트 반영)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Subscriptions;

```


---

## HTML (googleSheetsService)
```html
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

```


---

## HTML (types.ts)
```html

export interface Transaction {
  uniqueId: string;
  inputTime: string;
  category: string;
  subcategory: string;
  cost: number;
  account: string;
  note: string;
  date: string; // YYYY-MM-DD
  settlement: string;
  imageUrl?: string;
  rowIndex?: number;
  transferId?: string; // M열: 이동 ID
  settlementFromAccount?: string; // N열: 정산한통장
  settlementToAccount?: string;   // O열: 정산받은통장
  incomeSource?: string;          // P열: 수입처
}

export interface SalaryTemplateItem {
  category: string;
  subcategory: string;
  cost: number;
  account: string;
  note: string;
  settlement: string;
  rowIndex?: number;
}

export interface ChecklistItem {
  id: string;
  title: string;
  content: string;
  date: string;
  status: '대기' | '진행' | '완료' | '보류';
  rowIndex?: number;
}

export interface TodoGroup {
  id: string;
  title: string;
  memo: string;
  date: string;
  color?: string;
  rowIndex?: number;
}

export interface TodoItem {
  id: string;
  groupId: string; // 소속된 그룹 ID
  name: string;
  status: '대기' | '완료';
  date: string;
  rowIndex?: number;
}

export interface AssetPlan {
  id: string;
  title: string;
  content: string;
  date: string;
  tag: string;
  rowIndex?: number;
}

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  cycle: string;
  paymentMethod: string;
  startDate: string;
  tag: string;
  memo: string;
  status: '구독' | '해지';
  rowIndex?: number;
}

export type AccountType = '일반' | 'ISA' | 'IRP' | '연금저축';

export interface InvestmentItem {
  id: string;
  accountId?: string; // 계좌 연결을 위한 ID 추가
  name: string;
  broker: string;
  category: string;
  accountType: AccountType;
  date: string;
  price: number;
  quantity: number;
  totalCost: number;
  targetRatio: number;
  targetPrice: number;
  actualPrice: number;
  realizedProfit: number;
  note: string;
  stockCode?: string;
  currentPrice?: number;
  rowIndex?: number;
  sellDate?: string;
  soldQuantity?: number;
  soldPrice?: number;
  openingDate?: string;
}

export interface InvestmentGoal {
  category: string;
  targetRatio: number;
}

export interface AccountGoal {
  accountType: AccountType;
  targetRatio: number;
}

export interface InvestmentAccount {
  id: string;
  accountType: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  openDate: string;
  deposit: number;
  closeDate?: string;
  note?: string;
  rowIndex?: number;
}

export interface BankBalance {
  name: string;
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
}

export interface ExpenseStat {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface FixedKeyword {
  keyword: string;
  category: '수입' | '지출';
  expectedAmount: number;
}

export interface AverageStat {
  subcategory?: string;
  account?: string;
  avgIncome: number;
  avgExpense: number;
  totalIncome: number;
  totalExpense: number;
  count: number;
  monthCount: number;
  currentPeriodTotal: number;
}

export interface DashboardData {
  monthlyIncome: number;
  monthlyExpense: number;
  balance: number;
  transactionCount: number;
  recentTransactions: Transaction[];
  bankBalances: BankBalance[];
  expenseStats: ExpenseStat[];
  hiddenCategories: string[];
  hiddenAccounts: string[];
  baseDay: number;
}

export interface ProjectionConfig {
  monthlyContribution: number;
  expectedAnnualReturn: number;
  years: number;
}

export type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type DashboardViewMode = 'basic' | 'detail';

export interface FilterState {
  period: '1month' | '3months' | '6months' | 'all' | 'custom';
  category: string;
  settlement: string;
  search: string;
  startDate: string;
  endDate: string;
}

export enum Tab {
  DASHBOARD = 'dashboard',
  INPUT = 'input',
  HISTORY = 'history',
  SUBSCRIPTION = 'subscription',
  INVESTMENT = 'investment',
  SETTINGS = 'settings'
}

export type Theme = 'dark' | 'light';
export type AppMode = 'default' | 'gulbi' | 'test';

```


---

## HTML (analysisUtils)
```html

import { Transaction, DashboardData, ExpenseStat } from '../types';
import { HORSE_ACCOUNTS } from '../constants';

export const generateUniqueId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `TXN_${timestamp}_${random}`;
};

const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1', '#EF4444', '#6B7280'
];

/**
 * 거래 내역을 시간순으로 엄격하게 정렬합니다.
 */
export const sortTransactionsChronologically = (txns: Transaction[]): Transaction[] => {
  return [...txns].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    
    const timeA = a.inputTime || "";
    const timeB = b.inputTime || "";
    const timeCompare = timeA.localeCompare(timeB);
    if (timeCompare !== 0) return timeCompare;
    
    return a.uniqueId.localeCompare(b.uniqueId);
  });
};

export const isSameDate = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

export const getCustomMonthRange = (anchorDate: Date, baseDay: number) => {
  if (baseDay === 1) {
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), baseDay - 1, 23, 59, 59, 999);
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, baseDay, 0, 0, 0, 0);
  return { start, end };
};

export const processDashboardData = (
  transactions: Transaction[], 
  managedAccounts: string[],
  hiddenCategories: string[] = [],
  hiddenAccounts: string[] = [],
  baseDay: number = 1
): DashboardData => {
  const today = new Date();
  const { start: startDate, end: endDate } = getCustomMonthRange(today, baseDay);

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  
  // 전체 내역 정렬
  const allSorted = sortTransactionsChronologically(transactions);
  
  const monthlyTxns = allSorted.filter(t => {
    const d = new Date(t.date);
    return d >= startDate && d <= endDate;
  });

  const expenseMap: Record<string, number> = {};

  monthlyTxns.forEach(t => {
    if (t.category.includes('잔액조정')) return;
    if (t.cost > 0) monthlyIncome += t.cost;
    if (t.cost < 0) {
      const absCost = Math.abs(t.cost);
      monthlyExpense += absCost;
      if (t.category.includes('지출')) {
        expenseMap[t.subcategory] = (expenseMap[t.subcategory] || 0) + absCost;
      }
    }
  });

  const balances: Record<string, { income: number; expense: number; balance: number; count: number }> = {};
  managedAccounts.forEach(acc => {
    balances[acc] = { income: 0, expense: 0, balance: 0, count: 0 };
  });

  // 정렬된 순서대로 잔액 집계 (중요: 정합성 보장)
  allSorted.forEach(t => {
    const absCost = Math.abs(t.cost);
    
    // 1. 주 계좌 반영
    if (managedAccounts.includes(t.account)) {
      const b = balances[t.account];
      if (t.cost > 0) b.income += t.cost;
      else b.expense += absCost;
      b.balance += t.cost;
      b.count++;
    }

    // 2. 가상 정산 반영 (Non-Horse 계정만 대상)
    if (t.settlementFromAccount && managedAccounts.includes(t.settlementFromAccount) && !HORSE_ACCOUNTS.includes(t.settlementFromAccount)) {
      const b = balances[t.settlementFromAccount];
      b.expense += absCost;
      b.balance -= absCost;
      b.count++;
    }
    if (t.settlementToAccount && managedAccounts.includes(t.settlementToAccount) && !HORSE_ACCOUNTS.includes(t.settlementToAccount)) {
      const b = balances[t.settlementToAccount];
      b.income += absCost;
      b.balance += absCost;
      b.count++;
    }
  });

  const bankBalances = managedAccounts.map(name => ({
    name,
    income: balances[name].income,
    expense: balances[name].expense,
    balance: balances[name].balance,
    transactionCount: balances[name].count
  }));

  const rawStats = Object.entries(expenseMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const finalExpenseStats: ExpenseStat[] = rawStats.map((item, index) => ({
    name: item.name,
    amount: item.amount,
    percentage: monthlyExpense > 0 ? (item.amount / monthlyExpense) * 100 : 0,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  // 최근 내역은 역순으로 제공
  const recent = [...allSorted].reverse().slice(0, 10);

  return {
    monthlyIncome,
    monthlyExpense,
    balance: monthlyIncome - monthlyExpense,
    transactionCount: monthlyTxns.length,
    recentTransactions: recent,
    bankBalances,
    expenseStats: finalExpenseStats,
    hiddenCategories,
    hiddenAccounts,
    baseDay
  };
};

export const formatCurrency = (val: number) => {
  return Math.floor(val).toLocaleString('ko-KR') + '원';
};

```


---

## HTML (UIContext.tsx)
```html

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type SnackbarType = 'success' | 'error' | 'info';

interface UIContextType {
  showSnackbar: (message: string, type?: SnackbarType) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

interface UIProviderProps {
  children: ReactNode;
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  // Snackbar State
  const [snackbar, setSnackbar] = useState<{ message: string; type: SnackbarType; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false,
  });

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    message: '',
    isOpen: false,
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showSnackbar = useCallback((message: string, type: SnackbarType = 'info') => {
    setSnackbar({ message, type, isOpen: true });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, isOpen: false }));
    }, 3000);
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void, onCancel: () => void = () => {}) => {
    setConfirmModal({
      message,
      isOpen: true,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        onCancel();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  }, []);

  return (
    <UIContext.Provider value={{ showSnackbar, showConfirm }}>
      {children}

      {/* Snackbar Component - High z-index */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] transition-all duration-300 transform pointer-events-none ${
          snackbar.isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div
          className={`px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-3 whitespace-nowrap backdrop-blur-md ${
            snackbar.type === 'success'
              ? 'bg-green-600/90 text-white shadow-green-900/20'
              : snackbar.type === 'error'
              ? 'bg-red-600/90 text-white shadow-red-900/20'
              : 'bg-gray-800/90 dark:bg-white/90 text-white dark:text-black shadow-black/20'
          }`}
        >
          <span>
            {snackbar.type === 'success' && '✅'}
            {snackbar.type === 'error' && '⚠️'}
            {snackbar.type === 'info' && 'ℹ️'}
          </span>
          {snackbar.message}
        </div>
      </div>

      {/* Confirm Modal Component - Very high z-index */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[1010] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-xs rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 scale-100 animate-fade-in">
            <h3 className="text-lg font-bold mb-3 dark:text-white">확인</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-sm leading-relaxed whitespace-pre-wrap">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmModal.onCancel}
                className="flex-1 py-3.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};

```


---

## HTML (vite.config.ts)
```html
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss()
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

```


---

## HTML (tsconfig.json)
```html
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "types": [
      "node"
    ],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```


---

## HTML (package.json)
```html
{
  "name": "gulbzzus-budget",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.3.0",
    "autoprefixer": "^10.5.0",
    "framer-motion": "^12.34.3",
    "lucide-react": "^0.575.0",
    "postcss": "^8.5.14",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "recharts": "^3.7.0",
    "tailwindcss": "^4.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}

```


---

## HTML (ReamMe.md)
```html
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1WVoLsq4pGnZgHXlwQp1D1l3WME2xB5QR

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

```

---

## Python
```python
# Your Python code here
```