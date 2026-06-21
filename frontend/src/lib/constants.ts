// ─── Types ──────────────────────────────────────────

export interface Group {
  id: string;
  class: string;
  timing: string;
  category: 'Junior' | 'Senior';
}

export interface Student {
  id: string;
  name: string;
  category: 'Junior' | 'Senior';
  class: string;
  school: string;
  contactNo: string;
  fatherNo: string;
  motherNo: string;
  admDate: string;
  dob: string;
  feePerMonth: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  group?: string;
}

export interface Payment {
  id?: number;
  studentId: string;
  month: string;
  paid: boolean;
  amount: number;
  date: string;
  academicYear?: string;
}

export interface Receipt {
  id: string;
  studentId: string;
  studentName: string;
  category: 'Junior' | 'Senior';
  class: string;
  school: string;
  feePerMonth: number;
  period: string;
  months: string[];
  amtPaid: number;
  prevDue: number;
  totalRecv: number;
  remainingAmount?: number;
  nextDue: string;
  notes: string;
  generatedOn: string;
  generatedBy: string;
  academicYear?: string;
  remainingMonths?: string;
  admDate?: string;
}

export interface Settings {
  [key: string]: string;
}

// ─── Month Codes ────────────────────────────────────

export const MONTH_CODES = [
  'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG',
  'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB'
] as const;

export type MonthCode = typeof MONTH_CODES[number];

export const MONTH_NAMES: Record<string, string> = {
  MAR: 'March', APR: 'April', MAY: 'May', JUN: 'June',
  JUL: 'July', AUG: 'August', SEP: 'September', OCT: 'October',
  NOV: 'November', DEC: 'December', JAN: 'January', FEB: 'February',
};

export const MONTH_SHORT: Record<string, string> = {
  MAR: 'Mar', APR: 'Apr', MAY: 'May', JUN: 'Jun',
  JUL: 'Jul', AUG: 'Aug', SEP: 'Sep', OCT: 'Oct',
  NOV: 'Nov', DEC: 'Dec', JAN: 'Jan', FEB: 'Feb',
};

export const MONTH_CALENDAR_MAP: Record<string, { calendarMonth: number, academicIndex: number }> = {
  'MAR': { calendarMonth: 3, academicIndex: 0 },
  'APR': { calendarMonth: 4, academicIndex: 1 },
  'MAY': { calendarMonth: 5, academicIndex: 2 },
  'JUN': { calendarMonth: 6, academicIndex: 3 },
  'JUL': { calendarMonth: 7, academicIndex: 4 },
  'AUG': { calendarMonth: 8, academicIndex: 5 },
  'SEP': { calendarMonth: 9, academicIndex: 6 },
  'OCT': { calendarMonth: 10, academicIndex: 7 },
  'NOV': { calendarMonth: 11, academicIndex: 8 },
  'DEC': { calendarMonth: 12, academicIndex: 9 },
  'JAN': { calendarMonth: 1, academicIndex: 10 },
  'FEB': { calendarMonth: 2, academicIndex: 11 },
};

export function getMonthLabelWithYear(month: string, academicYear: string): string {
  const shortMonth = MONTH_SHORT[month] || month;
  const parts = academicYear.split('-');
  const startYearStr = parts[0] || '2026';
  const endYearStr = parts[1] || '27';
  const startSuffix = startYearStr.slice(-2);
  const endSuffix = endYearStr.length === 4 ? endYearStr.slice(-2) : endYearStr;
  const isNextYear = month === 'JAN' || month === 'FEB';
  const yearSuffix = isNextYear ? endSuffix : startSuffix;
  return `${shortMonth} ${yearSuffix}`;
}

// ─── Formatters ─────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getCurrentMonthCode(): MonthCode {
  const monthMap: Record<number, MonthCode> = {
    0: 'JAN', 1: 'FEB', 2: 'MAR', 3: 'APR', 4: 'MAY', 5: 'JUN',
    6: 'JUL', 7: 'AUG', 8: 'SEP', 9: 'OCT', 10: 'NOV', 11: 'DEC',
  };
  return monthMap[new Date().getMonth()];
}

// ─── Receipt Changed Event Emitter ──────────────────

type ReceiptChangeListener = () => void;
let receiptChangeListeners: ReceiptChangeListener[] = [];

export function onReceiptsChanged(listener: ReceiptChangeListener): () => void {
  receiptChangeListeners.push(listener);
  return () => {
    receiptChangeListeners = receiptChangeListeners.filter(l => l !== listener);
  };
}

export function notifyReceiptsChanged(): void {
  receiptChangeListeners.forEach(l => l());
}

// ─── Receipt ID Generation ──────────────────────────

/**
 * Generate a collision-safe receipt ID using crypto random.
 */
export function generateReceiptId(category: 'Junior' | 'Senior'): string {
  const prefix = category === 'Junior' ? 'JR' : 'SR';
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yy}${mm}${dd}`;
  
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes).map(b => b.toString(36)).join('').substring(0, 4).toUpperCase().padEnd(4, 'X');
  return `${prefix}-${dateStr}-${rand}`;
}

export function getApiBase(): string {
  if (import.meta.env.DEV) {
    return '';
  }
  let path = window.location.pathname;
  const routes = ['/login', '/students', '/groups', '/collect', '/receipts', '/dues', '/settings', '/about'];
  for (const r of routes) {
    if (path.endsWith(r)) {
      path = path.slice(0, -r.length);
      break;
    }
    if (path.endsWith(r + '/')) {
      path = path.slice(0, -r.length - 1);
      break;
    }
  }
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
}

export function formatReceiptPeriod(receipt: Receipt): string {
  if (!receipt || !receipt.period) return '';

  // If the period already has numbers (like 'Mar 26'), it means it already has a year suffix! Keep it as is!
  if (/\d/.test(receipt.period)) {
    return receipt.period;
  }

  // Otherwise, it's a legacy receipt without a year suffix. Let's parse months to add it!
  try {
    let months: string[] = [];
    if (typeof receipt.months === 'string') {
      months = JSON.parse(receipt.months);
    } else if (Array.isArray(receipt.months)) {
      months = receipt.months;
    }

    if (!months || months.length === 0) return receipt.period;

    let startSuffix = '';
    let endSuffix = '';

    if (receipt.academicYear) {
      const parts = receipt.academicYear.split('-');
      const startYearStr = parts[0] || '2026';
      const endYearStr = parts[1] || '27';
      startSuffix = startYearStr.slice(-2);
      endSuffix = endYearStr.length === 4 ? endYearStr.slice(-2) : endYearStr;
    } else {
      const genDate = new Date(receipt.generatedOn);
      const genYear = genDate.getFullYear();
      const genMonth = genDate.getMonth() + 1; // 1-indexed
      const genAcademicYearStart = genMonth >= 3 ? genYear : genYear - 1;
      startSuffix = genAcademicYearStart.toString().slice(-2);
      endSuffix = (genAcademicYearStart + 1).toString().slice(-2);
    }

    const getMonthYearSuffix = (monthCode: string) => {
      const isNextYear = monthCode === 'JAN' || monthCode === 'FEB';
      return isNextYear ? endSuffix : startSuffix;
    };

    const firstMonth = MONTH_SHORT[months[0]] || months[0];
    const lastMonth = MONTH_SHORT[months[months.length - 1]] || months[months.length - 1];

    const firstMonthWithYear = `${firstMonth} ${getMonthYearSuffix(months[0])}`;
    const lastMonthWithYear = `${lastMonth} ${getMonthYearSuffix(months[months.length - 1])}`;

    return months.length === 1 ? firstMonthWithYear : `${firstMonthWithYear} – ${lastMonthWithYear}`;
  } catch {
    // Fallback if parsing fails, append the generation year suffix
    const yr = new Date(receipt.generatedOn).getFullYear().toString().slice(-2);
    return `${receipt.period} ${yr}`;
  }
}

export function formatMonthNamesWithBrackets(str: string): string {
  return str;
}

export function applyReceiptToPayments(
  payments: Payment[],
  receipt: Receipt,
  feePerMonth: number,
  admDate?: string
): Payment[] {
  const monthOrder = ["MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","JAN","FEB"];
  const updatedPayments = payments.map(p => ({ ...p }));
  const getPayment = (month: string) => {
    let p = updatedPayments.find(pay => pay.month === month);
    if (!p) {
      p = {
        studentId: receipt.studentId,
        month,
        paid: false,
        amount: 0,
        date: (receipt.generatedOn || '').substring(0, 10),
        academicYear: receipt.academicYear
      };
      updatedPayments.push(p);
    }
    return p;
  };

  const months = receipt.months || [];
  if (months.length === 0) return updatedPayments;

  const sortedMonths = [...months].sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));

  const isBeforeAdmission = (m: string) => {
    if (!admDate) return false;
    const date = new Date(admDate);
    const admYear = date.getFullYear();
    const admMonth = date.getMonth() + 1;

    const MONTH_CALENDAR_MAP: Record<string, { calendarMonth: number }> = {
      MAR: { calendarMonth: 3 }, APR: { calendarMonth: 4 }, MAY: { calendarMonth: 5 },
      JUN: { calendarMonth: 6 }, JUL: { calendarMonth: 7 }, AUG: { calendarMonth: 8 },
      SEP: { calendarMonth: 9 }, OCT: { calendarMonth: 10 }, NOV: { calendarMonth: 11 },
      DEC: { calendarMonth: 12 }, JAN: { calendarMonth: 1 }, FEB: { calendarMonth: 2 },
    };

    const monthMeta = MONTH_CALENDAR_MAP[m];
    if (!monthMeta) return false;

    const academicYearStart = admMonth >= 3 ? admYear : admYear - 1;
    const targetCalendarMonth = monthMeta.calendarMonth;
    const targetYear = (m === 'JAN' || m === 'FEB') ? academicYearStart + 1 : academicYearStart;

    const targetDate = new Date(targetYear, targetCalendarMonth - 1, 1);
    const comparisonAdmDate = new Date(date.getFullYear(), date.getMonth(), 1);

    return targetDate < comparisonAdmDate;
  };

  // 1. Allocate prevDue
  let prevDueRemaining = receipt.prevDue || 0;
  if (prevDueRemaining > 0) {
    const lastMonthIndex = monthOrder.indexOf(sortedMonths[sortedMonths.length - 1]);
    if (lastMonthIndex !== -1) {
      for (let i = 0; i <= lastMonthIndex; i++) {
        if (prevDueRemaining <= 0) break;
        const m = monthOrder[i];
        if (isBeforeAdmission(m)) continue;

        const p = getPayment(m);
        const alreadyPaid = p.amount;
        const due = Math.max(0, feePerMonth - alreadyPaid);
        if (due > 0) {
          const alloc = Math.min(prevDueRemaining, due);
          prevDueRemaining -= alloc;
          p.amount = alreadyPaid + alloc;
          p.paid = true;
        }
      }
    }
  }

  // 2. Allocate amtPaid
  let remaining = receipt.amtPaid || 0;
  for (const m of sortedMonths) {
    const p = getPayment(m);
    const alreadyPaid = p.amount;
    const due = Math.max(0, feePerMonth - alreadyPaid);
    const alloc = Math.min(remaining, due);
    remaining -= alloc;
    p.amount = alreadyPaid + alloc;
    p.paid = true;
  }

  if (remaining > 0 && sortedMonths.length > 0) {
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    const p = getPayment(lastMonth);
    p.amount += remaining;
    p.paid = true;
  }

  return updatedPayments;
}
