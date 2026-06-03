
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
