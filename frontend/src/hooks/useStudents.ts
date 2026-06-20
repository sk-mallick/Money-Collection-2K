import { useState, useEffect, useCallback } from 'react';
import { api, mapServerStudent, fetchStudents, fetchPaymentsDirect, fetchReceipts, fetchGroups, fetchSettings } from '@/lib/api';
import { MONTH_CODES, getCurrentMonthCode, onReceiptsChanged, MONTH_CALENDAR_MAP } from '@/lib/constants';
import type { Student, Payment, Receipt, Group, MonthCode } from '@/lib/constants';

let cachedStudents: Student[] | null = null;
let cachedGroups: Group[] | null = null;
let cachedReceipts: Receipt[] | null = null;
let cachedSettings: Record<string, string> | null = null;


type InvalidateListener = (key: string) => void;
const invalidateListeners = new Set<InvalidateListener>();

export function useInvalidate() {
  const invalidate = useCallback((key: string) => {
    invalidateListeners.forEach(l => l(key));
  }, []);
  return { invalidate };
}

/**
 * Fetch all students from the API
 */
export function useStudents() {
  const [students, setStudents] = useState<Student[]>(cachedStudents || []);
  const [loading, setLoading] = useState(!cachedStudents);

  const refresh = useCallback(async () => {
    if (!cachedStudents) {
      setLoading(true);
    }
    try {
      const data = await fetchStudents();
      cachedStudents = data;
      setStudents(data);
    } catch (err) {
      console.error('[useStudents] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    const handleInvalidate = (key: string) => {
      if (key === 'students' || key === 'all') {
        refresh();
      }
    };
    invalidateListeners.add(handleInvalidate);
    return () => {
      clearTimeout(timer);
      invalidateListeners.delete(handleInvalidate);
    };
  }, [refresh]);

  return { students, loading, refresh };
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>(cachedGroups || []);
  const [loading, setLoading] = useState(!cachedGroups);

  const refresh = useCallback(async () => {
    if (!cachedGroups) {
      setLoading(true);
    }
    try {
      const data = await fetchGroups();
      cachedGroups = data;
      setGroups(data);
    } catch (err) {
      console.error('[useGroups] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    const handleInvalidate = (key: string) => {
      if (key === 'groups' || key === 'all') {
        refresh();
      }
    };
    invalidateListeners.add(handleInvalidate);
    return () => {
      clearTimeout(timer);
      invalidateListeners.delete(handleInvalidate);
    };
  }, [refresh]);

  return { groups, loading, refresh };
}

/**
 * Fetch a single student from the API
 */
export function useStudent(id: string | null) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) { setStudent(null); setLoading(false); return; }
    setLoading(true);
    try {
      const students = await fetchStudents();
      const found = students.find(s => s.id === id);
      setStudent(found || null);
    } catch (err) {
      console.error('[useStudent] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  return { student, loading, refresh };
}

/**
 * Fetch payments for a student from the API
 */
export function usePayments(studentId: string | null, academicYear?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!studentId) { setPayments([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchPaymentsDirect(studentId, academicYear);
      setPayments(data);
    } catch (err) {
      console.error('[usePayments] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId, academicYear]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  return { payments, loading, refresh };
}

/**
 * Fetch all receipts from the API
 */
export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>(cachedReceipts || []);
  const [loading, setLoading] = useState(!cachedReceipts);

  const refresh = useCallback(async () => {
    if (!cachedReceipts) {
      setLoading(true);
    }
    try {
      const data = await fetchReceipts();
      cachedReceipts = data;
      setReceipts(data);
    } catch (err) {
      console.error('[useReceipts] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  // Subscribe to cross-component receipt changes
  useEffect(() => {
    const unsub = onReceiptsChanged(() => {
      refresh();
    });
    return unsub;
  }, [refresh]);

  return { receipts, loading, refresh };
}

/**
 * Fetch all settings from the API
 */
export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(cachedSettings || {});
  const [loading, setLoading] = useState(!cachedSettings);

  const refresh = useCallback(async () => {
    if (!cachedSettings) {
      setLoading(true);
    }
    try {
      const data = await fetchSettings();
      cachedSettings = data;
      setSettings(data);
    } catch (err) {
      console.error('[useSettings] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  return { settings, loading, refresh };
}

/**
 * Helper to calculate admission academic index
 */
export function getAdmAcademicIndex(admDateStr: string | undefined, academicYear: string): number {
  if (!admDateStr) return 0;
  
  const admDate = new Date(admDateStr);
  const admYear = admDate.getFullYear();
  const admMonth = admDate.getMonth() + 1; // 1-indexed (1=Jan, 12=Dec)

  const admAcademicYear = admMonth >= 3 ? admYear : admYear - 1;
  const selectedAcademicYear = parseInt(academicYear.split('-')[0], 10) || 2026;

  if (admAcademicYear < selectedAcademicYear) {
    return 0;
  } else if (admAcademicYear > selectedAcademicYear) {
    return 12;
  } else {
    let admMonthCode = 'MAR';
    for (const key of Object.keys(MONTH_CALENDAR_MAP)) {
      if (MONTH_CALENDAR_MAP[key].calendarMonth === admMonth) {
        admMonthCode = key;
        break;
      }
    }
    return MONTH_CALENDAR_MAP[admMonthCode]?.academicIndex ?? 0;
  }
}

/**
 * Compute dues list — students who haven't paid for a given month
 */
export function useDues(month?: MonthCode) {
  const [dues, setDues] = useState<Array<Student & { pendingMonths: number; outstandingDue: number }>>([]);
  const [loading, setLoading] = useState(true);
  const selectedMonth = month || getCurrentMonthCode();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const studentRes = await api.getStudents();
      if (!studentRes.success || !Array.isArray(studentRes.students)) {
        setDues([]);
        return;
      }

      const settings = await fetchSettings();
      const activeAcademicYear = settings.academicYear || '2026-27';
      const duesList: Array<Student & { pendingMonths: number; outstandingDue: number }> = [];
      const selectedMonthIndex = MONTH_CODES.indexOf(selectedMonth);

      const paymentsMap = new Map<string, Payment[]>();
      const students: Student[] = [];
      
      for (const s of studentRes.students) {
        students.push(mapServerStudent(s));

        if (s.payments && Array.isArray(s.payments)) {
          const studentPayments: Payment[] = s.payments
            .filter((p: { paid: boolean | number | string }) => p.paid)
            .filter((p: { academic_year?: string }) => (p.academic_year || '2026-27') === activeAcademicYear)
            .map((p: { month: string; paid: boolean | number | string; amount: number | string; date: string | null; academic_year?: string }) => ({
              studentId: s.id,
              month: p.month,
              paid: Boolean(p.paid),
              amount: Number(p.amount),
              date: p.date || '',
              academicYear: p.academic_year || '2026-27',
            }));
          paymentsMap.set(s.id, studentPayments);
        }
      }

      for (const student of students) {
        const payments = paymentsMap.get(student.id) || [];
        const paidMonths = new Set(
          payments
            .filter(
              p =>
                p.paid &&
                (p.amount === 0 || p.amount >= student.feePerMonth)
            )
            .map(p => p.month)
        );

        const admAcademicIndex = getAdmAcademicIndex(student.admDate, activeAcademicYear);

        if (admAcademicIndex <= selectedMonthIndex) {
          if (!paidMonths.has(selectedMonth)) {
            const pendingMonths = MONTH_CODES.filter((m, idx) => {
              return idx >= admAcademicIndex && idx <= selectedMonthIndex && !paidMonths.has(m);
            }).length;

            let outstandingDue = 0;
            MONTH_CODES.forEach((m, idx) => {
              if (idx >= admAcademicIndex && idx <= selectedMonthIndex) {
                const p = payments.find(
                  pay => pay.month === m
                );
                if (!p || !p.paid) {
                  outstandingDue += student.feePerMonth;
                } else if (p.amount > 0) {
                  outstandingDue += Math.max(0, student.feePerMonth - p.amount);
                }
              }
            });

            duesList.push({ ...student, pendingMonths, outstandingDue });
          }
        }
      }

      setDues(duesList);
    } catch (err) {
      console.error('[useDues] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  return { dues, loading, refresh, selectedMonth };
}
