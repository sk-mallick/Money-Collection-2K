import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { MONTH_CODES, MONTH_SHORT } from '@/lib/constants';
import type { Student, Payment } from '@/lib/constants';

interface MonthGridProps {
  selected: Student;
  selectedMonths: string[];
  toggleMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (val: string) => void;
  payments: Payment[];
  academicYearOptions: string[];
  isMonthNotJoined: (admDateStr: string | undefined, monthCode: string) => boolean;
}

export function MonthGrid({
  selected,
  selectedMonths,
  toggleMonth,
  selectedYear,
  setSelectedYear,
  payments,
  academicYearOptions,
  isMonthNotJoined,
}: MonthGridProps) {
  return (
    <div className="space-y-3">
      {/* Header: Label on left, Session dropdown on right in a single line */}
      <div className="flex items-center justify-between gap-2.5 w-full min-w-0">
        <Label className="font-semibold text-xs sm:text-sm truncate select-none">
          Select Months to Collect
        </Label>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="h-7 w-[140px] sm:w-[155px] px-2.5 text-[11px] shrink-0 font-bold text-muted-foreground bg-background border-input shadow-xs select-none">
            <SelectValue placeholder="Session" />
          </SelectTrigger>
          <SelectContent position="popper" align="end" className="w-[145px] sm:w-[155px]">
            {academicYearOptions.map(year => (
              <SelectItem key={year} value={year} className="text-xs font-semibold">
                Session {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 w-full min-w-0">
        {MONTH_CODES.map(month => {
          const isSelected = selectedMonths.includes(month);

          // Determine status
          const paymentRecord = payments.find(p => p.month === month);
          const isFullyPaid = paymentRecord?.paid && paymentRecord.amount >= selected.feePerMonth;
          const isPartial = paymentRecord?.paid && paymentRecord.amount > 0 && paymentRecord.amount < selected.feePerMonth;
          const isNA = paymentRecord?.paid && paymentRecord.amount === 0;
          const isNotJoined = isMonthNotJoined(selected.admDate, month);

          let cardStyle =
            'border-border hover:border-indigo-500/50 hover:bg-accent/40 cursor-pointer text-muted-foreground hover:text-foreground';
          let statusText = 'Pending';
          let statusColor = 'text-muted-foreground';
          let monthTextClass = 'text-foreground';

          if (isFullyPaid) {
            cardStyle =
              'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 cursor-not-allowed shadow-sm';
            statusText = 'Paid';
            statusColor = 'text-emerald-100/90 font-bold';
            monthTextClass = 'text-white';
          } else if (isNA) {
            cardStyle =
              'border-amber-600 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-500 cursor-not-allowed shadow-sm';
            statusText = 'N/A';
            statusColor = 'text-amber-100/90 font-bold';
            monthTextClass = 'text-white';
          } else if (isNotJoined) {
            cardStyle = 'border-dashed border-muted bg-muted/20 text-muted-foreground/60 cursor-not-allowed opacity-60';
            statusText = 'Not Joined';
            statusColor = 'text-muted-foreground/50';
          } else if (isSelected) {
            cardStyle =
              'border-indigo-600 bg-indigo-600/10 text-indigo-600 dark:border-indigo-400 dark:bg-indigo-400/15 dark:text-indigo-400 shadow-xs scale-98 font-bold cursor-pointer';
            statusText = 'Selected';
            statusColor = 'text-indigo-600 dark:text-indigo-400';
          } else if (isPartial) {
            cardStyle =
              'border-amber-500/60 bg-amber-500/5 hover:border-amber-500 text-amber-700 dark:text-amber-400 cursor-pointer shadow-xs';
            statusText = `Partial (₹${paymentRecord.amount})`;
            statusColor = 'text-amber-600 dark:text-amber-500 font-bold';
            monthTextClass = 'text-amber-800 dark:text-amber-300';
          }

          const isDisabled = isFullyPaid || isNA || isNotJoined;

          return (
            <button
              key={month}
              type="button"
              disabled={isDisabled}
              onClick={() => toggleMonth(month)}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 p-2.5 text-center transition-all ${cardStyle}`}
            >
              {isFullyPaid && <Check className="absolute top-1 right-1 size-3 text-white" />}
              {isNA && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-white" />}
              <span className={`font-semibold text-xs ${monthTextClass}`}>
                {(() => {
                  const shortMonth = MONTH_SHORT[month] || month;
                  const academicYear = selectedYear;
                  const parts = academicYear.split('-');
                  const startYearStr = parts[0] || '2026';
                  const endYearStr = parts[1] || '27';
                  const startSuffix = startYearStr.slice(-2);
                  const endSuffix = endYearStr.length === 4 ? endYearStr.slice(-2) : endYearStr;
                  const isNextYear = month === 'JAN' || month === 'FEB';
                  const yearSuffix = isNextYear ? endSuffix : startSuffix;
                  return `${shortMonth} ${yearSuffix}`;
                })()}
              </span>
              <span className={`text-[9px] font-bold mt-0.5 uppercase tracking-wider ${statusColor}`}>
                {statusText}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visual Legend below all months: In desktop UI/UX in a single line */}
      <div className="flex items-center gap-x-3 sm:gap-x-4 md:gap-x-6 gap-y-1.5 flex-wrap sm:flex-nowrap text-[10px] sm:text-[11px] font-bold text-muted-foreground min-w-0 pt-0.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse-soft" />
          <span>Paid</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-2 rounded-full bg-amber-500" />
          <span className="sm:hidden">N/A</span>
          <span className="hidden sm:inline">N/A (Waiver)</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-2 rounded-full bg-amber-400/80 border border-amber-500/50" />
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-2 rounded-full bg-muted border border-muted-foreground/30" />
          <span>Not Joined</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-2 rounded-full bg-indigo-500" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="size-2 rounded-full bg-border border border-muted-foreground/20" />
          <span>Pending</span>
        </div>
      </div>

      {/* Horizontal divider line for professional UI/UX */}
      <Separator className="bg-border/80" />
    </div>
  );
}
