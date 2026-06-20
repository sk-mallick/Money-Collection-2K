import { Loader2, Wallet, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PaymentFormFieldsProps {
  selectedMonthsDue: number;
  prevDue: string;
  handlePrevDueChange: (val: string) => void;
  isPrevDueOverridden: boolean;
  amtPaid: string;
  setAmtPaid: (val: string) => void;
  remainingAmount: string;
  handleRemainingChange: (val: string) => void;
  isRemainingOverridden: boolean;
  nextDue: string;
  setNextDue: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  handleSubmit: () => void;
  handleMarkNA: () => void;
  submitting: boolean;
  selectedMonthsLength: number;
}

export function PaymentFormFields({
  selectedMonthsDue,
  prevDue,
  handlePrevDueChange,
  isPrevDueOverridden,
  amtPaid,
  setAmtPaid,
  remainingAmount,
  handleRemainingChange,
  isRemainingOverridden,
  nextDue,
  setNextDue,
  notes,
  setNotes,
  handleSubmit,
  handleMarkNA,
  submitting,
  selectedMonthsLength,
}: PaymentFormFieldsProps) {
  return (
    <>
      {/* Payment Fields */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Total Amount (₹)</Label>
          <Input
            type="number"
            disabled
            className="bg-muted/50 font-semibold cursor-not-allowed"
            value={selectedMonthsDue}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prevDue" className="flex items-center gap-1.5 justify-between">
            <span>Previous Dues (₹)</span>
            {isPrevDueOverridden && (
              <span className="text-[9px] text-amber-500 font-extrabold uppercase tracking-wider bg-amber-500/10 px-1 py-0.5 rounded-sm shrink-0">
                (Customized)
              </span>
            )}
          </Label>
          <Input
            id="prevDue"
            type="number"
            min={0}
            placeholder="0"
            value={prevDue}
            onChange={e => handlePrevDueChange(e.target.value)}
            className={
              isPrevDueOverridden ? 'border-amber-500/50 focus-visible:ring-amber-500 font-bold' : 'font-semibold'
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amtPaid">Paid Amount (₹) *</Label>
          <Input
            id="amtPaid"
            type="number"
            min={0}
            placeholder="Enter paid amount"
            value={amtPaid}
            onChange={e => setAmtPaid(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="remainingAmount" className="flex items-center gap-1.5 justify-between">
            <span>Remaining Amount (₹)</span>
            {isRemainingOverridden && (
              <span className="text-[9px] text-amber-500 font-extrabold uppercase tracking-wider bg-amber-500/10 px-1 py-0.5 rounded-sm shrink-0">
                (Customized)
              </span>
            )}
          </Label>
          <Input
            id="remainingAmount"
            type="number"
            placeholder="0"
            value={remainingAmount}
            onChange={e => handleRemainingChange(e.target.value)}
            className={
              isRemainingOverridden ? 'border-amber-500/50 focus-visible:ring-amber-500 font-bold' : 'font-semibold'
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nextDue">Next Due</Label>
          <Input
            id="nextDue"
            placeholder="e.g. July onwards"
            value={nextDue}
            onChange={e => setNextDue(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payNotes">Notes</Label>
          <Input
            id="payNotes"
            placeholder="Optional remarks"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={submitting || selectedMonthsLength === 0}
          className="flex-1 sm:flex-initial gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 font-bold border-none"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
          Collect & Generate Receipt
        </Button>
        <Button
          onClick={handleMarkNA}
          disabled={submitting || selectedMonthsLength === 0}
          variant="outline"
          className="flex-1 sm:flex-initial gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-950/20 font-bold"
        >
          <Check className="size-4" />
          Mark as N/A (Waiver)
        </Button>
      </div>
    </>
  );
}
