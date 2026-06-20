import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">PAYMENT HISTORY</h3>
      {paidPayments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments recorded yet</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Month</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paidPayments.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{MONTH_SHORT[p.month] || p.month}</TableCell>
                  <TableCell className="text-xs">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(p.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
