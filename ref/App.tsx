
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
    if (passwordValue === '0000") {
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
