import { getToken, clearAuth } from './auth';
import { getApiBase } from './constants';

// ─── Types ──────────────────────────────────────────

export interface Subject {
  id: number;
  name: string;
  category: 'Junior' | 'Senior' | 'Both';
  display_order: number;
  is_active: boolean;
}

export interface ResultPeriod {
  id: number;
  academic_year: string;
  month: string;
  group_id: string | null;
  category: 'Junior' | 'Senior';
  status: 'Draft' | 'Completed' | 'Published';
  created_by: number | null;
  created_at: string;
  updated_at: string;
  group_class?: string;
  group_timing?: string;
  student_count?: number;
  absent_count?: number;
  ranked_count?: number;
}

export interface StudentMark {
  markId: number;
  subjectId: number;
  subjectName: string;
  subjectCategory: string;
  maxMarks: number;
  obtainedMarks: number | null;
  isAbsent: boolean;
  isDefaultMax: boolean;
  displayOrder: number;
}

export interface StudentResult {
  studentResultId: number;
  studentId: string;
  name: string;
  class: string;
  groupId: string | null;
  school: string;
  category: 'Junior' | 'Senior';
  status: 'Present' | 'Absent' | 'Incomplete';
  totalObtained: number | null;
  totalMax: number | null;
  percentage: number | null;
  classRank: number | null;
  groupRank: number | null;
  marks: StudentMark[];
}

export interface RankingGroup {
  key: string;
  label: string;
  type?: 'class' | 'group';
  timing?: string;
  category?: string;
  groupClass?: string;
  subjects?: {
    id: number;
    name: string;
    category?: string;
    display_order: number;
  }[];
  students: {
    studentResultId?: number;
    studentId: string;
    name: string;
    class: string;
    school: string;
    groupId: string;
    totalObtained: number;
    totalMax: number;
    percentage: number;
    classRank: number | null;
    groupRank: number | null;
    displayRank?: number;
    marks?: {
      subjectId: number;
      subjectName: string;
      subjectCategory?: string;
      maxMarks: number;
      obtainedMarks: number | null;
      isAbsent?: boolean;
      displayOrder: number;
    }[];
  }[];
}

export interface StudentReportResult {
  id: number;
  result_period_id: number;
  student_id: string;
  snapshot_name: string;
  snapshot_class: string;
  snapshot_group_id: string;
  snapshot_school: string;
  snapshot_category: string;
  status: string;
  total_obtained: number | null;
  total_max: number | null;
  percentage: number | null;
  class_rank: number | null;
  group_rank: number | null;
  academic_year: string;
  month: string;
  group_id: string;
  period_category: string;
  period_status: string;
  group_class?: string;
  marks: {
    id: number;
    subject_id: number;
    max_marks: number;
    obtained_marks: number | null;
    is_absent?: number | boolean;
    is_default_max: number;
    subject_name: string;
    subject_category: string;
  }[];
}

export interface BlankSheetData {
  students: { id: string; name: string; class: string; school: string }[];
  subjects: { id: number; name: string; display_order: number }[];
  group: { id: string; class: string; timing: string; category: string } | null;
  settings: Record<string, string>;
}

// ─── API Request Helper ─────────────────────────────

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${endpoint}`, { ...options, headers });

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

// ─── Subjects API ───────────────────────────────────

export async function fetchSubjects(category?: string): Promise<Subject[]> {
  const params = category ? `?category=${category}` : '';
  const res = await apiRequest<{ success: boolean; subjects: Subject[] }>(`/api/result-subjects${params}`);
  return res.success ? res.subjects : [];
}

export async function createSubject(data: { name: string; category: string; displayOrder?: number }): Promise<{ id: number }> {
  return apiRequest('/api/result-subjects', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSubject(id: number, data: Partial<{ name: string; category: string; displayOrder: number; isActive: boolean }>): Promise<void> {
  await apiRequest(`/api/result-subjects?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteSubject(id: number): Promise<void> {
  await apiRequest(`/api/result-subjects?id=${id}`, { method: 'DELETE' });
}

// ─── Result Periods API ─────────────────────────────

export async function fetchResultPeriods(filters?: {
  academic_year?: string;
  month?: string;
  group_id?: string;
  status?: string;
}): Promise<ResultPeriod[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  }
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiRequest<{ success: boolean; periods: ResultPeriod[] }>(`/api/result-periods${qs}`);
  return res.success ? res.periods : [];
}

export async function fetchResultPeriod(id: number): Promise<ResultPeriod & { default_max_marks: unknown[]; student_results: unknown[] }> {
  const res = await apiRequest<{ success: boolean; period: ResultPeriod & { default_max_marks: unknown[]; student_results: unknown[] } }>(`/api/result-periods?id=${id}`);
  return res.period;
}

export async function createResultPeriod(data: {
  academicYear: string;
  month: string;
  groupId: string;
  category: string;
  defaultMaxMarks: { subjectId: number; maxMarks: number }[];
}): Promise<{ id: number; studentCount: number }> {
  return apiRequest('/api/result-periods', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateResultPeriod(id: number, data: {
  status?: string;
  defaultMaxMarks?: { subjectId: number; maxMarks: number }[];
}): Promise<void> {
  await apiRequest(`/api/result-periods?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteResultPeriod(id: number): Promise<void> {
  await apiRequest(`/api/result-periods?id=${id}`, { method: 'DELETE' });
}

// ─── Marks API ──────────────────────────────────────

export async function fetchMarks(periodId: number): Promise<StudentResult[]> {
  const res = await apiRequest<{ success: boolean; students: StudentResult[] }>(`/api/result-marks?period_id=${periodId}`);
  return res.success ? res.students : [];
}

export async function saveMarks(periodId: number, students: {
  studentResultId: number;
  status?: string;
  marks?: { markId: number; obtainedMarks: number | null; isAbsent?: boolean; maxMarks: number; isDefaultMax: boolean }[];
}[]): Promise<void> {
  await apiRequest('/api/result-marks', { method: 'POST', body: JSON.stringify({ periodId, students }) });
}

export async function recalculateResults(periodId: number): Promise<void> {
  await apiRequest(`/api/result-marks?period_id=${periodId}&action=recalculate`, { method: 'PUT' });
}

// ─── Rankings API ───────────────────────────────────

export async function fetchRankings(params: {
  period_id?: number;
  academic_year?: string;
  month?: string;
  type: 'class' | 'group';
}): Promise<RankingGroup[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
  const res = await apiRequest<{ success: boolean; rankings: RankingGroup[] }>(`/api/result-rankings?${qs.toString()}`);
  return res.success ? res.rankings : [];
}

// ─── Student Reports API ────────────────────────────

export async function fetchStudentReport(studentId: string): Promise<{
  student: {
    id: string;
    name: string;
    category: string;
    class: string;
    school: string;
    group_id: string;
    adm_date: string;
    dob?: string | null;
    contact_no?: string | null;
    father_no?: string | null;
    mother_no?: string | null;
  };
  results: StudentReportResult[];
  settings: Record<string, string>;
}> {
  const res = await apiRequest<{
    success: boolean;
    student: {
      id: string;
      name: string;
      category: string;
      class: string;
      school: string;
      group_id: string;
      adm_date: string;
      dob?: string | null;
      contact_no?: string | null;
      father_no?: string | null;
      mother_no?: string | null;
    };
    results: StudentReportResult[];
    settings: Record<string, string>;
  }>(`/api/result-reports?student_id=${studentId}`);
  return { student: res.student, results: res.results, settings: res.settings };
}

// ─── Blank Sheet API ────────────────────────────────

export async function fetchBlankSheet(groupId: string, category?: string): Promise<BlankSheetData> {
  const params = category ? `&category=${category}` : '';
  const res = await apiRequest<{ success: boolean } & BlankSheetData>(`/api/result-blank-sheet?group_id=${groupId}${params}`);
  return { students: res.students, subjects: res.subjects, group: res.group, settings: res.settings };
}
