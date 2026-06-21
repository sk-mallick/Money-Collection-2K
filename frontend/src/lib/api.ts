import { getToken, clearAuth } from './auth';
import { getApiBase } from './constants';
import type { Student, Payment, Receipt, Group } from './constants';

/**
 * MCMS API Client — Online-Only
 * All operations go directly to the PHP/MySQL backend.
 */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const base = getApiBase();
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearAuth();
    window.location.href = getApiBase() + '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API Error: ${res.status}`);
  }

  return data as T;
}

// ─── Server Response Types ──────────────────────────

interface ServerPayment {
  month: string;
  paid: boolean | number | string;
  amount: number | string;
  date: string | null;
  academic_year?: string;
  student_id?: string;
}

interface ServerStudent {
  id: string;
  name: string;
  category: 'Junior' | 'Senior';
  class: string;
  school: string;
  contact_no: string;
  father_no: string;
  mother_no: string;
  adm_date: string;
  dob: string | null;
  fee_per_month: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  group_id?: string | null;
  group?: string | null;
  payments?: ServerPayment[];
}

interface ServerReceipt {
  id: string;
  student_id: string;
  student_name: string;
  category: 'Junior' | 'Senior';
  class: string;
  school: string;
  fee_per_month: number | string;
  period: string;
  months: string | string[];
  amt_paid: number | string;
  prev_due: number | string;
  total_recv: number | string;
  remaining_amount?: number | string;
  next_due?: string | null;
  notes?: string | null;
  generated_on: string;
  generated_by: string;
  academic_year?: string;
  remaining_months?: string | null;
  adm_date?: string | null;
}

interface ServerGroup {
  id: string;
  class: string;
  timing: string;
  category: 'Junior' | 'Senior';
}

// ─── Data Mappers ───────────────────────────────────

export function mapServerStudent(s: ServerStudent): Student {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    class: s.class,
    school: s.school,
    contactNo: s.contact_no,
    fatherNo: s.father_no,
    motherNo: s.mother_no,
    admDate: s.adm_date,
    dob: s.dob || '',
    feePerMonth: Number(s.fee_per_month),
    notes: s.notes || '',
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    group: s.group || s.group_id || undefined,
  };
}

function mapServerPayment(p: ServerPayment, studentId?: string): Payment {
  return {
    studentId: studentId || p.student_id || '',
    month: p.month,
    paid: Boolean(p.paid),
    amount: Number(p.amount),
    date: p.date || '',
    academicYear: p.academic_year || '2026-27',
  };
}

function mapServerReceipt(r: ServerReceipt): Receipt {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    category: r.category,
    class: r.class,
    school: r.school,
    feePerMonth: Number(r.fee_per_month),
    period: r.period,
    months: typeof r.months === 'string' ? JSON.parse(r.months) : (r.months || []),
    amtPaid: Number(r.amt_paid),
    prevDue: Number(r.prev_due),
    totalRecv: Number(r.total_recv),
    remainingAmount: Number(r.remaining_amount || 0),
    nextDue: r.next_due || '',
    notes: r.notes || '',
    generatedOn: r.generated_on,
    generatedBy: r.generated_by,
    academicYear: r.academic_year || '2026-27',
    remainingMonths: r.remaining_months || '',
    admDate: r.adm_date || undefined,
  };
}

function mapServerGroup(g: ServerGroup): Group {
  return {
    id: g.id,
    class: g.class,
    timing: g.timing,
    category: g.category,
  };
}

// ─── API Methods ────────────────────────────────────

export const api = {
  // Auth
  verifyToken: () => apiRequest<{ valid: boolean; user: unknown }>('/auth/verify'),

  // Students — Raw API calls
  getStudents: () => apiRequest<{ success: boolean; students: ServerStudent[] }>('/api/students'),
  createStudent: (data: unknown) => apiRequest('/api/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id: string, data: unknown) => apiRequest(`/api/students?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id: string) => apiRequest(`/api/students?id=${id}`, { method: 'DELETE' }),

  // Payments
  getPayments: (studentId: string, academicYear?: string) => {
    let url = `/api/payments?studentId=${studentId}`;
    if (academicYear) url += `&academicYear=${academicYear}`;
    return apiRequest<{ success: boolean; payments: ServerPayment[] }>(url);
  },
  submitPayment: (data: unknown) => apiRequest<{ success: boolean; receipt: { id: string; period: string; amtPaid: number; totalRecv: number } }>('/api/payments', { method: 'POST', body: JSON.stringify(data) }),

  // Receipts
  getReceipts: () => apiRequest<{ success: boolean; receipts: ServerReceipt[] }>('/api/receipts'),
  getStudentReceipts: (studentId: string) => apiRequest<{ success: boolean; receipts: ServerReceipt[] }>(`/api/receipts?studentId=${studentId}`),
  deleteReceipt: (id: string) => apiRequest(`/api/receipts?id=${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => apiRequest<{ success: boolean; settings: Record<string, string> }>('/api/settings'),
  updateSettings: (data: Record<string, string>) => apiRequest('/api/settings', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data: unknown) => apiRequest<{ success: boolean; message: string }>('/api/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Groups
  getGroups: () => apiRequest<{ success: boolean; groups: ServerGroup[] }>('/api/groups'),
  createGroup: (data: unknown) => apiRequest('/api/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id: string, data: unknown) => apiRequest(`/api/groups?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id: string) => apiRequest(`/api/groups?id=${id}`, { method: 'DELETE' }),

  // Rollover
  performRollover: () => apiRequest<{ success: boolean; nextAcademicYear: string }>('/api/rollover', { method: 'POST' }),
};

// ─── High-Level Data Fetchers ───────────────────────

/** Fetch all students (mapped to frontend types) */
export async function fetchStudents(): Promise<Student[]> {
  const res = await api.getStudents();
  if (!res.success || !Array.isArray(res.students)) return [];
  return res.students.map(mapServerStudent);
}

/** Fetch payments for a student (mapped to frontend types) */
export async function fetchPayments(studentId: string, academicYear?: string): Promise<Payment[]> {
  // Use the students API response which includes payments
  const res = await api.getStudents();
  if (!res.success) return [];
  const student = res.students.find(s => s.id === studentId);
  if (!student?.payments) return [];
  
  return student.payments
    .filter(p => p.paid)
    .filter(p => !academicYear || (p.academic_year || '2026-27') === academicYear)
    .map(p => mapServerPayment(p, studentId));
}

/** Fetch payments directly from the payments API */
export async function fetchPaymentsDirect(studentId: string, academicYear?: string): Promise<Payment[]> {
  const res = await api.getPayments(studentId, academicYear);
  if (!res.success || !Array.isArray(res.payments)) return [];
  return res.payments.map((p: ServerPayment) => mapServerPayment(p, studentId === 'all' ? undefined : studentId));
}

/** Fetch all receipts (mapped to frontend types) */
export async function fetchReceipts(): Promise<Receipt[]> {
  const res = await api.getReceipts();
  if (!res.success || !Array.isArray(res.receipts)) return [];
  return res.receipts.map(mapServerReceipt);
}

/** Fetch receipts for a specific student */
export async function fetchStudentReceipts(studentId: string): Promise<Receipt[]> {
  const res = await api.getStudentReceipts(studentId);
  if (!res.success || !Array.isArray(res.receipts)) return [];
  return res.receipts.map(mapServerReceipt);
}

/** Fetch all groups (mapped to frontend types) */
export async function fetchGroups(): Promise<Group[]> {
  const res = await api.getGroups();
  if (!res.success || !Array.isArray(res.groups)) return [];
  return res.groups.map(mapServerGroup);
}

/** Fetch all settings */
export async function fetchSettings(): Promise<Record<string, string>> {
  const res = await api.getSettings();
  if (!res.success || !res.settings) return {};
  return res.settings;
}
