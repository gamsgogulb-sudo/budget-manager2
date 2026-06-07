import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfQuarter, 
  startOfWeek, 
  parseISO 
} from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export type PeriodType = '7d' | '30d' | 'month' | 'lastMonth' | 'thisQuarter' | 'thisWeek' | 'custom' | 'today';

interface PeriodSelectorProps {
  period: PeriodType;
  onChangePeriod: (period: PeriodType) => void;
  customRange: { start: string; end: string };
  onChangeCustomRange: (range: { start: string; end: string }) => void;
  className?: string;
  variant?: 'inline' | 'sheet';
}

export const getRangeFromPeriod = (period: PeriodType, customRange?: { start: string; end: string }) => {
  const now = new Date();
  switch (period) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) };
    case '7d': return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case '30d': return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'lastMonth': {
      const last = subMonths(now, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    case 'thisQuarter': return { start: startOfQuarter(now), end: endOfDay(now) };
    case 'thisWeek': return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfDay(now) };
    case 'custom': 
      if (customRange) {
        return { start: startOfDay(parseISO(customRange.start)), end: endOfDay(parseISO(customRange.end)) };
      }
      return { start: startOfMonth(now), end: endOfMonth(now) };
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
};

export default function PeriodSelector({ 
  period, 
  onChangePeriod, 
  customRange, 
  onChangeCustomRange, 
  className,
  variant = 'inline'
}: PeriodSelectorProps) {
  const presets = [
    { id: '7d', label: '7일' },
    { id: '30d', label: '30일' },
    { id: 'month', label: '이번 달' },
    { id: 'lastMonth', label: '지난 달' },
    { id: 'custom', label: '기간 설정' },
  ];

  const quickActions = [
    { id: 'today', label: '오늘' },
    { id: 'thisWeek', label: '이번 주' },
    { id: 'month', label: '이번 달' },
    { id: 'thisQuarter', label: '이번 분기' },
  ];

  if (variant === 'sheet') {
    return (
      <div className={cn("space-y-8", className)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#86868B] ml-1">시작일</label>
            <input 
              type="date"
              value={customRange.start}
              onChange={(e) => {
                onChangePeriod('custom');
                onChangeCustomRange({ ...customRange, start: e.target.value });
              }}
              className="theme-input w-full appearance-none h-14"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#86868B] ml-1">종료일</label>
            <input 
              type="date"
              value={customRange.end}
              onChange={(e) => {
                onChangePeriod('custom');
                onChangeCustomRange({ ...customRange, end: e.target.value });
              }}
              className="theme-input w-full appearance-none h-14"
            />
          </div>
        </div>

         <div className="space-y-4">
          <p className="text-xs font-semibold text-[#86868B] ml-1 uppercase tracking-wider">주요 기간 선택</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickActions.map((btn) => (
              <button 
                key={btn.id}
                onClick={() => onChangePeriod(btn.id as PeriodType)}
                className={cn(
                  "theme-btn-secondary w-full text-xs font-semibold h-12",
                  period === btn.id && "border-[#0066cc] text-[#0066cc] bg-[#0066cc]/10"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex bg-[#F5F5F7] p-1 rounded-[11px] w-full overflow-x-auto no-scrollbar">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => onChangePeriod(p.id as PeriodType)}
            className={cn(
              "flex-1 px-4 py-1.5 rounded-[11px] text-xs font-bold transition-all whitespace-nowrap",
              period === p.id || (p.id === 'custom' && period === 'custom') 
                ? "bg-white text-[#0066cc] shadow-none" 
                : "text-[#86868B] hover:text-[#1D1D1F]"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {period === 'custom' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 p-4 bg-[#F5F5F7] rounded-[18px]">
              <div className="flex-1 min-w-[140px]">
                <p className="text-[10px] font-bold text-[#86868B] uppercase mb-1.5 ml-1">시작일</p>
                <input 
                  type="date"
                  value={customRange.start}
                  onChange={(e) => onChangeCustomRange({ ...customRange, start: e.target.value })}
                  className="w-full bg-white border-none rounded-[11px] px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-[#0066cc]/20 transition-all"
                />
              </div>
              <div className="text-[#C7C7CC] pt-5 hidden sm:block">~</div>
              <div className="flex-1 min-w-[140px]">
                <p className="text-[10px] font-bold text-[#86868B] uppercase mb-1.5 ml-1">종료일</p>
                <input 
                  type="date"
                  value={customRange.end}
                  onChange={(e) => onChangeCustomRange({ ...customRange, end: e.target.value })}
                  className="w-full bg-white border-none rounded-[11px] px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-[#0066cc]/20 transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
