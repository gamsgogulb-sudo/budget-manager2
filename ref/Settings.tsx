
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
