import { Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Student } from '@/lib/constants';

interface StudentInfoCardProps {
  selected: Student;
  formatCurrency: (val: number) => string;
  formatDate: (date?: string) => string;
}

export function StudentInfoCard({
  selected,
  formatCurrency,
  formatDate,
}: StudentInfoCardProps) {
  return (
    <Card className="rounded-xl overflow-hidden shadow-sm border bg-card/45 backdrop-blur-md py-0 gap-0">
      <CardContent className="p-3 md:p-3.5 px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Side: Student Name Header */}
          <div className="flex items-center justify-between md:justify-start gap-2.5 shrink-0 border-b md:border-b-0 pb-2 md:pb-0 w-full md:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-400">
                <Wallet className="size-4 shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground leading-none">{selected.name}</h3>
                  <Badge
                    className={
                      selected.category === 'Junior'
                        ? 'hidden md:inline-flex bg-blue-600 text-white dark:bg-blue-500 text-[9px] font-bold border-none px-1.5 py-0 hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors h-4.5'
                        : 'hidden md:inline-flex bg-red-600 text-white dark:bg-red-500 text-[9px] font-bold border-none px-1.5 py-0 hover:bg-red-700 dark:hover:bg-red-600 transition-colors h-4.5'
                    }
                  >
                    {selected.category}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block font-medium">Active Student Profile</span>
              </div>
            </div>
            {/* Responsive badge on mobile/tablet */}
            <Badge
              className={
                selected.category === 'Junior'
                  ? 'md:hidden bg-blue-600 text-white dark:bg-blue-500 text-[9px] font-bold border-none px-1.5 py-0 hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors h-4.5'
                  : 'md:hidden bg-red-600 text-white dark:bg-red-500 text-[9px] font-bold border-none px-1.5 py-0 hover:bg-red-700 dark:hover:bg-red-600 transition-colors h-4.5'
              }
            >
              {selected.category}
            </Badge>
          </div>
          {/* Right Side: Grid of 4 Structured Metadata Columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4 md:flex md:flex-wrap md:items-center md:gap-6 flex-1 md:justify-end">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold">ID</span>
              <span className="font-mono font-bold text-foreground mt-0.5 block">{selected.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold">Class</span>
              <span className="font-semibold text-foreground mt-0.5 block">{selected.class || '-'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold">Fee/Month</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{formatCurrency(selected.feePerMonth)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold">Admission Date</span>
              <span className="font-semibold text-foreground mt-0.5 block">{formatDate(selected.admDate)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
