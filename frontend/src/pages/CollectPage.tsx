import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStudents, usePayments, useSettings } from '@/hooks/useStudents';
import { CollectPageLoading } from '@/components/loading-skeletons';
import { toast } from 'sonner';
import { api, fetchStudentReceipts } from '@/lib/api';
import {
  MONTH_CODES,
  formatCurrency,
  formatDate,
  generateReceiptId,
  notifyReceiptsChanged,
  MONTH_CALENDAR_MAP,
  getMonthLabelWithYear,
  MONTH_SHORT,
} from '@/lib/constants';
import { generateReceiptPDF } from '@/lib/pdf';
import type { Student, Receipt } from '@/lib/constants';
import { StudentSelector } from '@/components/collect/student-selector';
import { StudentInfoCard } from '@/components/collect/student-info-card';
import { MonthGrid } from '@/components/collect/month-grid';
import { PaymentFormFields } from '@/components/collect/payment-form-fields';
import { PaymentHistoryTable } from '@/components/collect/payment-history-table';
import { Wallet } from 'lucide-react';

export default function CollectPage() {
  const { students, loading } = useStudents();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get('studentId');

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Student | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [amtPaid, setAmtPaid] = useState('');
  const [prevDue, setPrevDue] = useState('');
  const [nextDue, setNextDue] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2026-27');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [isRemainingOverridden, setIsRemainingOverridden] = useState(false);
  const [isPrevDueOverridden, setIsPrevDueOverridden] = useState(false);

  // Declare usePayments and paidMonths first so they are available to everything below
  const { payments, refresh: refreshPayments } = usePayments(selected?.id || null, selectedYear);
  const paidMonths = new Set(
    payments
      .filter(p => p.paid && (p.amount === 0 || p.amount >= (selected?.feePerMonth || 0)))
      .map(p => p.month)
  );

  const getSelectedMonthsDue = useCallback((months: string[]) => {
    if (!selected) return 0;
    return months.reduce((sum, m) => {
      const pRecord = payments.find(p => p.month === m);
      if (!pRecord || !pRecord.paid) {
        return sum + selected.feePerMonth;
      }
      if (pRecord.amount === 0) {
        return sum; // Waived
      }
      return sum + Math.max(0, selected.feePerMonth - pRecord.amount);
    }, 0);
  }, [selected, payments]);

  const isMonthNotJoined = useCallback((admDateStr: string | undefined, monthCode: string) => {
    if (!admDateStr) return false;
    const admDate = new Date(admDateStr);
    const admYear = admDate.getFullYear();
    const admMonth = admDate.getMonth() + 1; // 1-indexed (1=Jan, 12=Dec)

    const targetInfo = MONTH_CALENDAR_MAP[monthCode];
    if (!targetInfo) return false;

    const admAcademicYear = admMonth >= 3 ? admYear : admYear - 1;

    const selectedYearParts = selectedYear.split('-');
    const selectedAcademicYear = parseInt(selectedYearParts[0]) || 2026;

    if (admAcademicYear > selectedAcademicYear) {
      return true;
    } else if (admAcademicYear === selectedAcademicYear) {
      let admMonthCode = 'MAR';
      for (const key of Object.keys(MONTH_CALENDAR_MAP)) {
        if (MONTH_CALENDAR_MAP[key].calendarMonth === admMonth) {
          admMonthCode = key;
          break;
        }
      }
      const admAcademicIndex = MONTH_CALENDAR_MAP[admMonthCode]?.academicIndex ?? 0;
      if (targetInfo.academicIndex < admAcademicIndex) {
        return true;
      }
    }
    return false;
  }, [selectedYear]);

  useEffect(() => {
    if (settings?.academicYear) {
      const timer = setTimeout(() => setSelectedYear(settings.academicYear), 0);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  // 1. Automatically calculate Previous Dues (unless overridden by the user)
  useEffect(() => {
    if (!selected || isPrevDueOverridden) return;

    const calculateDues = async () => {
      // Fetch last receipt remaining amount from API
      let lastReceiptRemaining = 0;
      try {
        const studentReceipts = await fetchStudentReceipts(selected.id);
        if (studentReceipts.length > 0) {
          studentReceipts.sort((a, b) => new Date(b.generatedOn).getTime() - new Date(a.generatedOn).getTime());
          lastReceiptRemaining = studentReceipts[0].remainingAmount || 0;
        }
      } catch {
        // Ignore — use 0 as fallback
      }

      // Calculate how much of the selected months' unpaid dues are already in payments
      const selectedMonthsAlreadyPaidDues = selectedMonths.reduce((sum, m) => {
        const pRecord = payments.find(p => p.month === m);
        if (pRecord && pRecord.paid) {
          if (pRecord.amount === 0) return sum; // Waived
          return sum + Math.max(0, selected.feePerMonth - pRecord.amount);
        }
        return sum;
      }, 0);

      const calculatedPrevDue = Math.max(0, lastReceiptRemaining - selectedMonthsAlreadyPaidDues);
      setPrevDue(calculatedPrevDue.toString());
    };

    calculateDues();
  }, [selected, selectedMonths, payments, isPrevDueOverridden]);

  // 2. Automatically calculate Remaining Amount (unless overridden by the user)
  useEffect(() => {
    if (!selected || isRemainingOverridden) return;

    const selectedMonthsDue = getSelectedMonthsDue(selectedMonths);
    const pDue = parseInt(prevDue, 10) || 0;
    const pPaid = parseInt(amtPaid, 10) || 0;
    const calcRemaining = (selectedMonthsDue + pDue) - pPaid;
    const timer = setTimeout(() => setRemainingAmount(calcRemaining >= 0 ? calcRemaining.toString() : '0'), 0);
    return () => clearTimeout(timer);
  }, [selected, selectedMonths, payments, amtPaid, prevDue, isRemainingOverridden, getSelectedMonthsDue]);

  const handlePrevDueChange = (val: string) => {
    if (val === '') {
      setIsPrevDueOverridden(false);
    } else {
      setPrevDue(val);
      setIsPrevDueOverridden(true);
    }
  };

  // Sync Paid Amount to Total Amount on month/student selection change
  useEffect(() => {
    const total = getSelectedMonthsDue(selectedMonths);
    const timer = setTimeout(() => {
      setAmtPaid(total > 0 ? total.toString() : '');
      setIsRemainingOverridden(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedMonths, selected, payments, getSelectedMonthsDue]);

  const handleRemainingChange = (val: string) => {
    if (val === '') {
      setIsRemainingOverridden(false);
    } else {
      setRemainingAmount(val);
      setIsRemainingOverridden(true);
    }
  };

  const getAcademicYearOptions = (activeYear: string) => {
    const years = new Set<string>();
    years.add(activeYear || '2026-27');
    const parts = (activeYear || '2026-27').split('-');
    const startYear = parseInt(parts[0]) || 2026;
    for (let i = -2; i <= 2; i++) {
      const y = startYear + i;
      const nextY = (y + 1).toString().slice(-2);
      years.add(`${y}-${nextY}`);
    }
    return Array.from(years).sort();
  };

  useEffect(() => {
    if (studentIdParam && students.length > 0) {
      const match = students.find(s => s.id === studentIdParam);
      if (match) {
        const timer = setTimeout(() => setSelected(match), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [studentIdParam, students]);

  const filteredStudents = search.length >= 1
    ? students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 8)
    : [];

  const selectStudent = (student: Student) => {
    setSelected(student);
    setSearch('');
    setSelectedMonths([]);
    setAmtPaid('');
    setPrevDue('');
    setRemainingAmount('');
    setIsRemainingOverridden(false);
    setIsPrevDueOverridden(false);
    setNextDue('');
    setNotes('');
  };

  const toggleMonth = (month: string) => {
    if (paidMonths.has(month)) return;
    if (selected && isMonthNotJoined(selected.admDate, month)) return;

    const isCurrentlySelected = selectedMonths.includes(month);

    if (isCurrentlySelected) {
      setSelectedMonths(prev => prev.filter(m => m !== month));
    } else {
      setSelectedMonths(prev => {
        const combined = [...prev, month];
        return combined.sort(
          (a, b) => MONTH_CODES.indexOf(a as typeof MONTH_CODES[number]) - MONTH_CODES.indexOf(b as typeof MONTH_CODES[number])
        );
      });
    }
  };

  const handleMarkNA = async () => {
    if (!selected || selectedMonths.length === 0) {
      toast.error('Select at least one month to waive');
      return;
    }

    setSubmitting(true);
    try {
      // Sort months in academic order
      const sortedMonths = [...selectedMonths].sort(
        (a, b) => MONTH_CODES.indexOf(a as typeof MONTH_CODES[number]) - MONTH_CODES.indexOf(b as typeof MONTH_CODES[number])
      );

      const receiptId = generateReceiptId(selected.category);

      // Submit a zero-amount payment via the API (handles both payment + receipt creation)
      await api.submitPayment({
        studentId: selected.id,
        months: sortedMonths,
        amtPaid: 0,
        receiptId,
        prevDue: 0,
        remainingAmount: 0,
        nextDue: nextDue || 'N/A (Waiver)',
        notes: notes || 'Fee Waiver (N/A)',
        date: new Date().toISOString().split('T')[0],
        academicYear: selectedYear,
      });

      notifyReceiptsChanged();

      toast.success('Fee waived (N/A) successfully');
      setSelectedMonths([]);
      setAmtPaid('');
      setPrevDue('');
      setRemainingAmount('');
      setIsRemainingOverridden(false);
      setIsPrevDueOverridden(false);
      setNextDue('');
      setNotes('');

      refreshPayments();
    } catch {
      toast.error('Failed to waive fee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selected || selectedMonths.length === 0) {
      toast.error('Select at least one month');
      return;
    }
    if (amtPaid === '' || parseInt(amtPaid, 10) < 0) {
      toast.error('Enter the amount received');
      return;
    }

    setSubmitting(true);
    try {
      const amount = parseInt(amtPaid, 10) || 0;
      const prevDueAmt = parseInt(prevDue, 10) || 0;
      const remainingAmt = parseInt(remainingAmount, 10) || 0;
      const date = new Date().toISOString().split('T')[0];

      // Sort months in academic order
      const sortedMonths = [...selectedMonths].sort(
        (a, b) => MONTH_CODES.indexOf(a as typeof MONTH_CODES[number]) - MONTH_CODES.indexOf(b as typeof MONTH_CODES[number])
      );

      const receiptId = generateReceiptId(selected.category);

      // Submit payment via the API — server handles payment allocation + receipt creation
      await api.submitPayment({
        studentId: selected.id,
        months: sortedMonths,
        amtPaid: amount,
        receiptId,
        prevDue: prevDueAmt,
        remainingAmount: remainingAmt,
        nextDue: nextDue.trim(),
        notes: notes.trim(),
        date,
        academicYear: selectedYear,
      });

      notifyReceiptsChanged();

      // Build receipt for PDF generation (local only)
      const firstMonth = getMonthLabelWithYear(sortedMonths[0], selectedYear);
      const lastMonth = getMonthLabelWithYear(sortedMonths[sortedMonths.length - 1], selectedYear);
      const period = sortedMonths.length === 1 ? firstMonth : `${firstMonth} – ${lastMonth}`;
      const totalRecv = amount + prevDueAmt;

      // Compute remaining months locally for immediate PDF download
      let localRemainingMonths = '';
      if (remainingAmt > 0) {
        let remainingAlloc = amount;
        const localNewTotals: Record<string, number> = {};
        for (const m of sortedMonths) {
          const pRecord = payments.find(p => p.month === m);
          const alreadyPaid = pRecord && pRecord.paid ? pRecord.amount : 0;
          const due = pRecord && pRecord.paid && pRecord.amount === 0 ? 0 : Math.max(0, selected.feePerMonth - alreadyPaid);

          if (remainingAlloc >= due) {
            localNewTotals[m] = alreadyPaid + due;
            remainingAlloc -= due;
          } else {
            localNewTotals[m] = alreadyPaid + remainingAlloc;
            remainingAlloc = 0;
          }
        }

        const remainingMonthsList: string[] = [];
        const lastSelectedMonth = sortedMonths[sortedMonths.length - 1];
        const lastSelectedIndex = MONTH_CODES.indexOf(lastSelectedMonth as typeof MONTH_CODES[number]);
        const monthsUpToLast = MONTH_CODES.slice(0, lastSelectedIndex + 1);

        for (const m of monthsUpToLast) {
          if (isMonthNotJoined(selected.admDate, m)) continue;

          const pRecord = payments.find(p => p.month === m);
          const isPaid = sortedMonths.includes(m) ? true : (pRecord?.paid ?? false);
          const amt = sortedMonths.includes(m) ? (localNewTotals[m] ?? 0) : (pRecord?.amount ?? 0);
          const isWaived = isPaid && amt === 0;

          if (!isWaived) {
            if (!isPaid || amt < selected.feePerMonth) {
              remainingMonthsList.push(MONTH_SHORT[m] || m);
            }
          }
        }
        localRemainingMonths = remainingMonthsList.join(', ');
      } else {
        // Find the fully paid month when remainingAmt is 0
        let fullyPaidMonth = null;
        for (const m of sortedMonths) {
          const pRecord = payments.find(p => p.month === m);
          const prevAmount = pRecord && pRecord.paid ? pRecord.amount : 0;
          if (prevAmount > 0 && prevAmount < selected.feePerMonth) {
            fullyPaidMonth = MONTH_SHORT[m] || m;
          }
        }
        localRemainingMonths = fullyPaidMonth || '';
      }

      const receiptForPDF: Receipt = {
        id: receiptId,
        studentId: selected.id,
        studentName: selected.name,
        category: selected.category,
        class: selected.class,
        school: selected.school,
        feePerMonth: selected.feePerMonth,
        period,
        months: sortedMonths,
        amtPaid: amount,
        prevDue: prevDueAmt,
        totalRecv,
        remainingAmount: remainingAmt,
        nextDue: nextDue.trim(),
        notes: notes.trim(),
        generatedOn: new Date().toISOString(),
        generatedBy: 'Admin',
        academicYear: selectedYear,
        remainingMonths: localRemainingMonths,
      };

      // Generate PDF
      await generateReceiptPDF(receiptForPDF);

      toast.success(`Receipt ${receiptId} generated and downloaded`);

      // Reset
      setSelectedMonths([]);
      setAmtPaid('');
      setPrevDue('');
      setRemainingAmount('');
      setIsRemainingOverridden(false);
      setIsPrevDueOverridden(false);
      setNextDue('');
      setNotes('');
      refreshPayments();
    } catch (error) {
      toast.error('Failed to process payment');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <CollectPageLoading />;

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Collect Fee</h1>
        <p className="text-sm text-muted-foreground">Record payment and generate receipt</p>
      </div>

      <StudentSelector
        search={search}
        setSearch={val => {
          setSearch(val);
          if (!val) setSelected(null);
        }}
        filteredStudents={filteredStudents}
        selectStudent={selectStudent}
      />

      {selected && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <StudentInfoCard
              selected={selected}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />

            <MonthGrid
              selected={selected}
              selectedMonths={selectedMonths}
              toggleMonth={toggleMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              payments={payments}
              academicYearOptions={getAcademicYearOptions(settings?.academicYear || '2026-27')}
              isMonthNotJoined={isMonthNotJoined}
            />

            <PaymentFormFields
              selectedMonthsDue={getSelectedMonthsDue(selectedMonths)}
              prevDue={prevDue}
              handlePrevDueChange={handlePrevDueChange}
              isPrevDueOverridden={isPrevDueOverridden}
              amtPaid={amtPaid}
              setAmtPaid={setAmtPaid}
              remainingAmount={remainingAmount}
              handleRemainingChange={handleRemainingChange}
              isRemainingOverridden={isRemainingOverridden}
              nextDue={nextDue}
              setNextDue={setNextDue}
              notes={notes}
              setNotes={setNotes}
              handleSubmit={handleSubmit}
              handleMarkNA={handleMarkNA}
              submitting={submitting}
              selectedMonthsLength={selectedMonths.length}
            />
          </div>

          <PaymentHistoryTable
            payments={payments}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        </div>
      )}

      {!selected && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Wallet className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium">Select a Student</p>
          <p className="text-sm text-muted-foreground">Search and select a student above to collect fee</p>
        </div>
      )}
    </div>
  );
}
