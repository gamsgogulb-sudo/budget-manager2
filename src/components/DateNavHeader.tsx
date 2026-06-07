import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  subMonths, 
  addMonths, 
  isSameDay, 
  isToday, 
  isWithinInterval,
  eachDayOfInterval
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface DateNavHeaderProps {
  currentViewDate: Date;
  onViewDateChange: (date: Date) => void;
  isMonthlyView: boolean;
  setIsMonthlyView: (isMonthly: boolean) => void;
  selectedDate: Date;
  onSelectedDateChange: (date: Date) => void;
  dateRange: { start: Date; end: Date } | null;
  onPeriodClick: () => void;
  dailySummaries?: Record<string, { income: number; expense: number }>;
  showViewToggle?: boolean;
  showCalendar?: boolean;
  summaryLabel?: React.ReactNode;
}

export default function DateNavHeader({
  currentViewDate,
  onViewDateChange,
  isMonthlyView,
  setIsMonthlyView,
  selectedDate,
  onSelectedDateChange,
  dateRange,
  onPeriodClick,
  dailySummaries = {},
  showViewToggle = true,
  showCalendar = true,
  summaryLabel
}: DateNavHeaderProps) {
  
  const handlePrev = () => {
    if (isMonthlyView) {
      onViewDateChange(subMonths(currentViewDate, 1));
    } else {
      onViewDateChange(addDays(currentViewDate, -7));
    }
  };

  const handleNext = () => {
    if (isMonthlyView) {
      onViewDateChange(addMonths(currentViewDate, 1));
    } else {
      onViewDateChange(addDays(currentViewDate, 7));
    }
  };

  const weekDays = React.useMemo(() => {
    const weekStart = startOfWeek(currentViewDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [currentViewDate]);
  
  const monthDays = React.useMemo(() => {
    const start = startOfMonth(currentViewDate);
    const end = endOfMonth(currentViewDate);
    const calStart = startOfWeek(start, { weekStartsOn: 0 });
    const calEnd = endOfWeek(end, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentViewDate]);

  const days = isMonthlyView ? monthDays : weekDays;

  const formatVal = (val: number) => {
    if (val >= 10000) return `${(val / 10000).toFixed(0)}만`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}천`;
    return val.toLocaleString();
  };

  return (
    <div className="mb-6 px-1">
      {/* Month Navigator Row */}
      <div className="flex items-center justify-between py-2 mb-6">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">
          {format(currentViewDate, 'yyyy년 M월', { locale: ko })}
        </h1>
        <div className="flex items-center gap-1 bg-[#F2F2F7] p-1 rounded-xl">
          <button 
            onClick={handlePrev}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-[#1D1D1F]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={handleNext}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-[#1D1D1F]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* View Selection & Period Sync Controls */}
      <div className="flex items-center justify-between gap-3 mb-6">
        {showViewToggle ? (
          <div className="flex items-center gap-1 bg-[#F2F2F7] p-1 rounded-full">
            <button 
              onClick={() => setIsMonthlyView(true)}
              className={cn(
                "px-6 py-2.5 rounded-full text-xs font-semibold transition-all",
                isMonthlyView ? "bg-white text-[#1D1D1F] shadow-none" : "text-[#86868B] hover:text-[#1D1D1F]"
              )}
            >
              월간
            </button>
            <button 
              onClick={() => setIsMonthlyView(false)}
              className={cn(
                "px-6 py-2.5 rounded-full text-xs font-semibold transition-all",
                !isMonthlyView ? "bg-white text-[#1D1D1F] shadow-none" : "text-[#86868B] hover:text-[#1D1D1F]"
              )}
            >
              주간
            </button>
          </div>
        ) : (
          <div className="flex-1">
            {summaryLabel}
          </div>
        )}
        <button 
          onClick={onPeriodClick}
          className="theme-btn-secondary h-12 px-5 text-xs font-bold"
        >
          <CalendarIcon className="w-4 h-4 text-[#86868B]" />
          <span>기간 설정</span>
        </button>
      </div>

      {showCalendar && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="pb-4"
        >
          <div className="grid grid-cols-7 gap-1">
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-[#86868B] py-2">{d}</div>
            ))}
            {days.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const summary = dailySummaries[dateKey];
              const isSel = isSameDay(day, selectedDate) && !dateRange;
              const isTod = isToday(day);
              const isOtherMonth = isMonthlyView && day.getMonth() !== currentViewDate.getMonth();
              
              const isInRange = dateRange && isWithinInterval(day, { start: dateRange.start, end: dateRange.end });
              const isRangeStart = dateRange && isSameDay(day, dateRange.start);
              const isRangeEnd = dateRange && isSameDay(day, dateRange.end);

              return (
                <button
                  key={idx}
                  onClick={() => onSelectedDateChange(day)}
                  className={cn(
                    "flex flex-col items-center justify-between py-2 rounded-[11px] transition-all aspect-[4/5] relative",
                    isOtherMonth 
                      ? "opacity-20 pointer-events-none" 
                      : isSel 
                        ? "hover:bg-[#2C2C2E]" 
                        : (isRangeStart || isRangeEnd)
                          ? "hover:bg-[#0055b3]" 
                          : isInRange
                            ? "hover:bg-[#0066cc]/20"
                            : "hover:bg-[#F2F2F7]",
                    isSel 
                      ? "bg-[#1D1D1F] text-white shadow-none z-20 scale-105" 
                      : isInRange
                        ? "bg-[#0066cc]/10 text-[#1D1D1F] z-0"
                        : "bg-transparent text-[#1D1D1F]",
                    isRangeStart && "rounded-l-[11px] bg-[#0066cc] text-white z-10",
                    isRangeEnd && "rounded-r-[11px] bg-[#0066cc] text-white z-10",
                    isInRange && !isRangeStart && !isRangeEnd && "rounded-none",
                    isTod && !isSel && !isRangeStart && !isRangeEnd && "text-[#0066cc] font-bold"
                  )}
                >
                  <span className="text-sm font-semibold">{format(day, 'd')}</span>
                  <div className="w-full text-[8px] font-bold space-y-0.5 mt-1 overflow-hidden z-10 px-1">
                    {summary?.income > 0 && (
                      <div className={cn("truncate text-[#34C759]", (isSel || isRangeStart || isRangeEnd) ? "text-white/80" : "")}>
                        {formatVal(summary.income)}
                      </div>
                    )}
                    {summary?.expense > 0 && (
                      <div className={cn("truncate text-[#FF3B30]", (isSel || isRangeStart || isRangeEnd) ? "text-white/80" : "")}>
                        {formatVal(summary.expense)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
