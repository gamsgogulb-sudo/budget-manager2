
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
