
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
