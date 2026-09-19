import { getToken, clearAuth } from './auth';
import { getApiBase } from './constants';

// ─── Types ──────────────────────────────────────────

export interface HWClassSession {
  id: number;
  session_code?: string;
  group_id: string;
  session_date: string;
  month?: string;
  academic_year: string;
  created_by: number | null;
  created_at: string;
  group_class?: string;
  group_timing?: string;
  group_category?: string;
  record_count?: number;
}

export type HomeworkStatus = 'Done' | 'Not Done' | 'Absent' | 'Not Provided' | 'N/A' | null;
export type TestPrepStatus = 'Prepared' | 'Not Prepared' | 'Absent' | 'Not Provided' | 'N/A' | null;
export type PracticeStatus = 'Practiced' | 'Not Practiced' | 'On Leave' | 'Not Provided' | 'N/A' | null;

export interface HWStudentRecord {
  id: number | null;
  session_id: number;
  session_code?: string;
  student_id: string;
  student_name: string;
  student_class?: string;
  student_school?: string;
  homework_status: HomeworkStatus;
  test_prep_status: TestPrepStatus;
  practice_status: PracticeStatus;
}

export interface HWExportData {
  group: {
    id: string;
    class: string;
    timing: string;
    category: string;
  };
  sessions: HWClassSession[];
  students: { id: string; name: string; class?: string; school?: string }[];
  records: HWStudentRecord[];
}

// ─── Internal Request Helper ────────────────────────

async function hwApiRequest<T>(
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

// ─── API Functions ──────────────────────────────────

/** Fetch sessions for a group (optionally filtered by month/year) */
export async function fetchHWSessions(
  groupId?: string,
  month?: number,
  year?: string,
): Promise<HWClassSession[]> {
  let url = '/api/homework';
  const params: string[] = [];
  if (groupId) params.push(`group_id=${encodeURIComponent(groupId)}`);
  if (month) params.push(`month=${month}`);
  if (year) params.push(`year=${encodeURIComponent(year)}`);
  if (params.length > 0) url += '?' + params.join('&');

  const res = await hwApiRequest<{ success: boolean; sessions: HWClassSession[] }>(url);
  return res.success ? res.sessions : [];
}

/** Fetch records for a specific session */
export async function fetchHWSessionRecords(sessionId: number): Promise<{
  session: HWClassSession;
  records: HWStudentRecord[];
}> {
  const res = await hwApiRequest<{
    success: boolean;
    session: HWClassSession;
    records: HWStudentRecord[];
  }>(`/api/homework?action=session_records&session_id=${sessionId}`);

  return { session: res.session, records: res.records };
}

/** Create a new session for a group on a date */
export async function createHWSession(
  groupId: string,
  sessionDate: string,
  academicYear: string,
): Promise<{ session_id: number; session_code?: string }> {
  const res = await hwApiRequest<{ success: boolean; session_id: number; session_code?: string }>(
    '/api/homework',
    {
      method: 'POST',
      body: JSON.stringify({
        group_id: groupId,
        session_date: sessionDate,
        academic_year: academicYear,
      }),
    },
  );
  return { session_id: res.session_id, session_code: res.session_code };
}

/** Save/update batch student records for a session */
export async function saveHWRecords(
  sessionId: number,
  records: Array<{
    student_id: string;
    homework_status: HomeworkStatus;
    test_prep_status: TestPrepStatus;
    practice_status: PracticeStatus;
  }>,
): Promise<{ saved_count: number }> {
  const res = await hwApiRequest<{ success: boolean; saved_count: number }>(
    '/api/homework?action=save_records',
    {
      method: 'PUT',
      body: JSON.stringify({ session_id: sessionId, records }),
    },
  );
  return { saved_count: res.saved_count };
}

/** Delete a session (and all its records via cascade) */
export async function deleteHWSession(sessionId: number): Promise<void> {
  await hwApiRequest(`/api/homework?session_id=${sessionId}`, {
    method: 'DELETE',
  });
}

/** Export monthly data */
export async function fetchHWExport(
  groupId: string,
  month: number,
  year: string,
): Promise<HWExportData> {
  const res = await hwApiRequest<{ success: boolean } & HWExportData>(
    `/api/homework?action=export&group_id=${encodeURIComponent(groupId)}&month=${month}&year=${encodeURIComponent(year)}`,
  );
  return {
    group: res.group,
    sessions: res.sessions,
    students: res.students,
    records: res.records,
  };
}
