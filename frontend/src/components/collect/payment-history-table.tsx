import { History, ReceiptText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MONTH_SHORT } from '@/lib/constants';
import type { Payment } from '@/lib/constants';

interface PaymentHistoryTableProps {
  payments: Payment[];
  formatCurrency: (val: number) => string;
  formatDate: (date?: string) => string;
}

export function PaymentHistoryTable({
  payments,
  formatCurrency,
  formatDate,
}: PaymentHistoryTableProps) {
  const paidPayments = payments.filter(p => p.paid);
  const totalReceived = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <Card className="rounded-xl border bg-card/45 backdrop-blur-md overflow-hidden shadow-sm w-full min-w-0">
      <CardHeader className="p-3.5 sm:p-4 pb-3 border-b flex flex-row items-center justify-between space-y-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
            <History className="size-3.5" />
          </div>
          <CardTitle className="text-xs sm:text-sm font-semibold tracking-tight truncate">
            Payment History
          </CardTitle>
        </div>
        <Badge
          variant={paidPayments.length > 0 ? 'secondary' : 'outline'}
          className="text-[10px] font-bold shrink-0 px-2 py-0.5"
        >
          {paidPayments.length} {paidPayments.length === 1 ? 'Payment' : 'Payments'}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        {paidPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="p-2.5 rounded-full bg-muted/40 text-muted-foreground/50 mb-2">
              <ReceiptText className="size-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">No Payments Recorded Yet</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
              Receipts and completed fee collections will appear here.
            </p>
          </div>
        ) : (
          <div>
            {/* Minimal Column Header */}
            <div className="grid grid-cols-[85px_1fr_auto] items-center px-3.5 sm:px-4 py-2.5 bg-muted/25 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              <div className="flex items-center gap-2">
                <span className="size-1.5 opacity-0 shrink-0" />
                <span>Month</span>
              </div>
              <span className="pl-1">Date</span>
              <span className="text-right">Amount</span>
            </div>

            {/* List of Payments */}
            <div className="max-h-[340px] overflow-y-auto divide-y divide-border/60">
              {paidPayments.map((p, i) => {
                const isWaived = p.amount === 0;
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[85px_1fr_auto] items-center px-3.5 sm:px-4 py-2.5 sm:py-3 hover:bg-muted/20 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`size-1.5 rounded-full shrink-0 ${
                          isWaived ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                      <span className="font-semibold text-foreground text-xs shrink-0">
                        {MONTH_SHORT[p.month] || p.month}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate pl-1">
                      {formatDate(p.date)}
                    </span>
                    <span
                      className={`font-bold shrink-0 text-right ${
                        isWaived
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isWaived ? 'Waived' : formatCurrency(p.amount)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer Summary */}
            <div className="px-3.5 sm:px-4 py-2.5 border-t bg-muted/20 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Total Paid</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalReceived)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
