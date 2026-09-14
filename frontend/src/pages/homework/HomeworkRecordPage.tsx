import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Separator } from '@/components/ui/separator';
import {
  fetchHWSessions, fetchHWSessionRecords, createHWSession, saveHWRecords, deleteHWSession,
  type HWClassSession, type HWStudentRecord, type HomeworkStatus, type TestPrepStatus, type PracticeStatus,
} from '@/lib/homework-api';
import { fetchGroups, fetchSettings } from '@/lib/api';
import { useStudents } from '@/hooks/useStudents';
import type { Group } from '@/lib/constants';
import { toast } from 'sonner';
import {
  ArrowLeft, Calendar, ClipboardCheck, BookOpen, Home, Plus, Save, Loader2, Trash2, Users,
  CheckCircle2, XCircle, UserX, Ban, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';

// ─── Status option configs ──────────────────────────

const HW_OPTIONS: { value: HomeworkStatus; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: 'Done', label: 'Done', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
  { value: 'Not Done', label: 'Not Done', icon: XCircle, color: 'text-red-500 dark:text-red-400' },
  { value: 'Absent', label: 'Absent', icon: UserX, color: 'text-amber-600 dark:text-amber-400' },
  { value: 'N/A', label: 'N/A', icon: Ban, color: 'text-muted-foreground' },
];

const TP_OPTIONS: { value: TestPrepStatus; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: 'Prepared', label: 'Prepared', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
  { value: 'Not Prepared', label: 'Not Prepared', icon: XCircle, color: 'text-red-500 dark:text-red-400' },
  { value: 'Absent', label: 'Absent', icon: UserX, color: 'text-amber-600 dark:text-amber-400' },
  { value: 'N/A', label: 'N/A', icon: Ban, color: 'text-muted-foreground' },
];

const PR_OPTIONS: { value: PracticeStatus; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: 'Practiced', label: 'Practiced', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
  { value: 'Not Practiced', label: 'Not Practiced', icon: XCircle, color: 'text-red-500 dark:text-red-400' },
  { value: 'On Leave', label: 'On Leave', icon: UserX, color: 'text-amber-600 dark:text-amber-400' },
  { value: 'N/A', label: 'N/A', icon: Ban, color: 'text-muted-foreground' },
];

// Day name mapper
const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateDatesForMonth(year: number, month: number, dayNames: string[]): Date[] {
  const dayNums = dayNames.map(d => DAY_MAP[d]).filter(d => d !== undefined);
  if (dayNums.length === 0) return [];
  const dates: Date[] = [];
  const d = new Date(year, month - 1, 1, 12, 0, 0);
  while (d.getMonth() === month - 1) {
    if (dayNums.includes(d.getDay())) {
      dates.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export default function HomeworkRecordPage() {
  const { students } = useStudents();
  const [groups, setGroups] = useState<Group[]>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);

  // Calculate student count per group batch (identical to mcms/groups)
  const groupStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      if (s.group) {
        counts[s.group] = (counts[s.group] || 0) + 1;
      }
    });
    return counts;
  }, [students]);

  // Selection state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Session state
  const [sessions, setSessions] = useState<HWClassSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  // Records state
  const [records, setRecords] = useState<HWStudentRecord[]>([]);
  const [sessionInfo, setSessionInfo] = useState<HWClassSession | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('homework');

  // Map of student details (class, school) for fast lookup
  const studentMap = useMemo(() => {
    const map = new Map<string, { class?: string; school?: string }>();
    students.forEach((s) => {
      map.set(s.id, { class: s.class, school: s.school });
    });
    return map;
  }, [students]);

  const getStudentClass = useCallback((rec: HWStudentRecord) => {
    return rec.student_class || studentMap.get(rec.student_id)?.class || selectedGroup?.class || '—';
  }, [studentMap, selectedGroup]);

  const getStudentSchool = useCallback((rec: HWStudentRecord) => {
    return rec.student_school || studentMap.get(rec.student_id)?.school || '—';
  }, [studentMap]);

  // Sorting state for desktop evaluations table
  const [sortColumn, setSortColumn] = useState<'id' | 'name' | 'school' | 'homework' | 'test_prep' | 'practice'>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: 'id' | 'name' | 'school' | 'homework' | 'test_prep' | 'practice') => {
    if (sortColumn === col) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      if (sortColumn === 'id') {
        const cmp = (a.student_id || '').localeCompare(b.student_id || '', undefined, { numeric: true });
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortColumn === 'name') {
        const cmp = (a.student_name || '').localeCompare(b.student_name || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortColumn === 'school') {
        const sA = a.student_school || studentMap.get(a.student_id)?.school || '';
        const sB = b.student_school || studentMap.get(b.student_id)?.school || '';
        const cmp = sA.localeCompare(sB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortColumn === 'homework') {
        const cmp = (a.homework_status || '').localeCompare(b.homework_status || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortColumn === 'test_prep') {
        const cmp = (a.test_prep_status || '').localeCompare(b.test_prep_status || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortColumn === 'practice') {
        const cmp = (a.practice_status || '').localeCompare(b.practice_status || '');
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [records, sortColumn, sortDirection, studentMap]);

  // Dialogs
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('');
  const [addingSession, setAddingSession] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<number | null>(null);

  // ─── Load initial data ────────────────────────────
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsData, settingsData] = await Promise.all([
        fetchGroups(),
        fetchSettings(),
      ]);
      setGroups(groupsData);
      setAcademicYear(settingsData.academicYear || '2026-27');
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // ─── Load sessions when group/month changes ───────
  const loadSessions = useCallback(async () => {
    if (!selectedGroupId) return;
    setSessionsLoading(true);
    setSelectedSessionId(null);
    setRecords([]);
    setSessionInfo(null);
    try {
      const data = await fetchHWSessions(selectedGroupId, selectedMonth, academicYear);
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      toast.error('Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, [selectedGroupId, selectedMonth, academicYear]);

  useEffect(() => {
    if (selectedGroupId && academicYear) {
      loadSessions();
    }
  }, [selectedGroupId, selectedMonth, academicYear, loadSessions]);

  // ─── Load records when session is selected ────────
  const loadRecords = useCallback(async (sessionId: number) => {
    setRecordsLoading(true);
    try {
      const { session, records: recs } = await fetchHWSessionRecords(sessionId);
      setSessionInfo(session);
      setRecords(recs);
    } catch (err) {
      console.error('Failed to load records:', err);
      toast.error('Failed to load records');
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadRecords(selectedSessionId);
    }
  }, [selectedSessionId, loadRecords]);

  // ─── Derived data ─────────────────────────────────
  const availableDates = useMemo(() => {
    if (!selectedGroup?.timing) return [];
    const days = selectedGroup.timing.split(',').map(d => d.trim()).filter(Boolean);
    return generateDatesForMonth(selectedYear, selectedMonth, days);
  }, [selectedGroup, selectedMonth, selectedYear]);

  const existingSessionDates = useMemo(() => {
    return new Set(sessions.map(s => s.session_date));
  }, [sessions]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // ─── Handlers ─────────────────────────────────────

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedSessionId(null);
    setSessions([]);
    setRecords([]);
    setSessionInfo(null);
  };

  const handleDateClick = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setActiveTab('homework');
  };

  const handleAddSessionDate = async (dateStr: string) => {
    if (!selectedGroupId || !dateStr) return;
    setAddingSession(true);
    try {
      const { session_id } = await createHWSession(selectedGroupId, dateStr, academicYear);
      toast.success('Session created successfully');
      await loadSessions();
      setSelectedSessionId(session_id);
      setActiveTab('homework');
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to create session');
    } finally {
      setAddingSession(false);
      setAddSessionOpen(false);
      setNewSessionDate('');
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;
    try {
      await deleteHWSession(deleteSessionId);
      toast.success('Session deleted');
      if (selectedSessionId === deleteSessionId) {
        setSelectedSessionId(null);
        setRecords([]);
        setSessionInfo(null);
      }
      loadSessions();
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to delete session');
    } finally {
      setDeleteSessionId(null);
    }
  };

  const updateRecord = (studentId: string, field: 'homework_status' | 'test_prep_status' | 'practice_status', value: string) => {
    setRecords(prev =>
      prev.map(r =>
        r.student_id === studentId ? { ...r, [field]: value || null } : r
      )
    );
  };

  const handleSave = async () => {
    if (!selectedSessionId) return;
    setSaving(true);
    try {
      const payload = records.map(r => ({
        student_id: r.student_id,
        homework_status: r.homework_status,
        test_prep_status: r.test_prep_status,
        practice_status: r.practice_status,
      }));
      const { saved_count } = await saveHWRecords(selectedSessionId, payload);
      toast.success(`Saved ${saved_count} records`);
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to save records');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (selectedSessionId) {
      setSelectedSessionId(null);
      setRecords([]);
      setSessionInfo(null);
    } else if (selectedGroupId) {
      setSelectedGroupId(null);
      setSessions([]);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('en-IN', { weekday: 'short' });
  };

  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' });
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // ─── STEP 1: Group Selection ──────────────────────
  if (!selectedGroupId) {
    return (
      <div className="page-enter space-y-6 text-left p-4 md:p-6 w-full">
        {/* Top Header */}
        <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Record Entry</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              <span className="sm:hidden">Select a group</span>
              <span className="hidden sm:inline">Select a group to start recording homework status</span>
            </p>
          </div>
          <div className="text-xs font-semibold text-muted-foreground px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-muted/50 border border-border/40 shrink-0">
            {groups.length} Groups
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Card key={idx} className="overflow-hidden flex flex-col justify-between">
                <div>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 pt-4 pb-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-lg bg-accent animate-pulse shrink-0" />
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="h-4 w-20 rounded-md bg-accent animate-pulse" />
                        <div className="h-3 w-14 rounded-md bg-accent animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="h-5 w-14 rounded-full bg-accent animate-pulse" />
                      <div className="h-7 w-7 rounded-md bg-accent animate-pulse" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pt-0 pb-3.5">
                    <div className="h-9 rounded-lg bg-accent animate-pulse" />
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                onClick={() => handleGroupSelect(group.id)}
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/20 flex flex-col justify-between cursor-pointer active:scale-[0.99]"
              >
                <div>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 pt-4 pb-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 font-mono text-base font-bold text-primary ring-1 ring-primary/20 shrink-0 group-hover:scale-105 transition-transform">
                        {group.id}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-semibold truncate text-foreground" title={group.class}>
                          {group.class}
                        </CardTitle>
                        <CardDescription className="text-[10px] mt-0.5 truncate text-muted-foreground">
                          Group ID: {group.id}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 select-none">
                      <Badge
                        variant={group.category === "Junior" ? "junior" : "senior"}
                        className="text-[11px] px-2 py-0.5 font-bold"
                      >
                        {group.category}
                      </Badge>
                      <div className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pt-0 pb-3.5">
                    <div className="text-xs text-muted-foreground flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/40 group-hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-1.5 min-w-0 truncate" title={`Classes On: ${group.timing || 'None'}`}>
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground truncate text-xs">
                          {group.timing || 'None'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-border/40">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-bold text-foreground font-mono text-xs">
                          {groupStudentCounts[group.id] || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── STEP 2: Date Selection ───────────────────────
  if (!selectedSessionId) {
    return (
      <div className="p-3 sm:p-5 lg:p-6 space-y-4 w-full">
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-3 border-b pb-3.5 sm:pb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground leading-tight flex items-center gap-2">
              Group {selectedGroup?.id}
              <Badge variant={selectedGroup?.category === 'Junior' ? 'junior' : 'senior'} className="text-[10px] font-bold">
                {selectedGroup?.category}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {selectedGroup?.class} · {selectedGroup?.timing}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Add Session (+ icon to the left of Back) */}
            <Button
              size="sm"
              onClick={() => setAddSessionOpen(true)}
              className="h-8 w-8 p-0 sm:w-auto sm:px-3 text-xs gap-1.5 cursor-pointer shrink-0"
              title="Add Session"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Add Session</span>
            </Button>

            {/* Back Button (at the right corner) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0 sm:w-auto sm:px-3 text-xs gap-1.5 cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium shrink-0">Month:</Label>
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, i) => (
                <SelectItem key={i} value={String(i + 1)} className="text-xs">{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sessions Grid */}
        {sessionsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {sessions.length === 0 && availableDates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No class dates for this month</p>
                  <p className="text-xs text-muted-foreground mt-1">Check group timing or add a session manually</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {/* Existing sessions */}
                {sessions.map(session => (
                  <Card
                    key={session.id}
                    className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all duration-200 active:scale-[0.98] border-primary/25 bg-card relative group rounded-xl overflow-hidden"
                    onClick={() => handleDateClick(session.id)}
                  >
                    <CardContent className="p-3 sm:p-3.5 flex flex-col items-center text-center justify-between h-full min-h-[140px]">
                      {/* Top Row: Session Code + Delete */}
                      <div className="w-full flex items-center justify-between gap-1 mb-1">
                        {session.session_code ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 font-mono font-bold tracking-tight bg-primary/5 text-primary border-primary/30 truncate max-w-[110px]"
                          >
                            {session.session_code}
                          </Badge>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSessionId(session.id);
                          }}
                          className="opacity-60 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-destructive cursor-pointer shrink-0"
                          title="Delete Session"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Center Hero: Date & Weekday */}
                      <div className="my-auto py-1">
                        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">
                          {new Date(session.session_date + 'T12:00:00').getDate()}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground mt-1">
                          {formatDay(session.session_date)}, {formatDate(session.session_date)}
                        </div>
                      </div>

                      {/* Bottom: Student Records Badge */}
                      <div className="mt-1 w-full flex items-center justify-center">
                        <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 gap-1 shadow-2xs">
                          <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{session.record_count || 0} recorded</span>
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Available dates (not yet created) */}
                {availableDates
                  .filter(d => {
                    const iso = toLocalISODate(d);
                    return !existingSessionDates.has(iso);
                  })
                  .map(d => {
                    const iso = toLocalISODate(d);
                    return (
                      <Card
                        key={iso}
                        className="cursor-pointer border-dashed border-border/80 hover:border-primary/50 hover:bg-accent/25 transition-all duration-200 active:scale-[0.98] rounded-xl overflow-hidden group bg-muted/15"
                        onClick={() => handleAddSessionDate(iso)}
                      >
                        <CardContent className="p-3 sm:p-3.5 flex flex-col items-center text-center justify-between h-full min-h-[140px]">
                          {/* Top Row spacer to align with active cards */}
                          <div className="w-full flex items-center justify-between gap-1 mb-1">
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">
                              Class Date
                            </span>
                          </div>

                          {/* Center Hero: Date & Weekday */}
                          <div className="my-auto py-1">
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground/75 group-hover:text-primary transition-colors leading-none">
                              {d.getDate()}
                            </div>
                            <div className="text-xs font-medium text-muted-foreground mt-1">
                              {d.toLocaleDateString('en-IN', { weekday: 'short' })}, {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </div>
                          </div>

                          {/* Bottom: Start button pill */}
                          <div className="mt-1 w-full flex items-center justify-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground px-2.5 py-0.5 rounded-full transition-colors shadow-2xs">
                              <Plus className="h-3 w-3 shrink-0" />
                              <span>Start</span>
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                }
              </div>
            )}
          </>
        )}

        {/* Add Session Dialog */}
        <Dialog open={addSessionOpen} onOpenChange={setAddSessionOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Session</DialogTitle>
              <DialogDescription>Add a custom class date for Group {selectedGroupId}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="session-date">Date</Label>
                <input
                  id="session-date"
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAddSessionOpen(false)} disabled={addingSession}>Cancel</Button>
              <Button onClick={() => handleAddSessionDate(newSessionDate)} disabled={addingSession || !newSessionDate}>
                {addingSession && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteSessionId}
          onOpenChange={(open) => !open && setDeleteSessionId(null)}
          title="Delete Session"
          description="This will permanently delete this session and all its student records. This action cannot be undone."
          actionLabel="Delete Session"
          onConfirm={handleDeleteSession}
          variant="destructive"
        />
      </div>
    );
  }

  // ─── STEP 3: Tabs + Student Records ───────────────
  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 w-full">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-3 border-b pb-3.5 sm:pb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-tight truncate flex items-center gap-2">
            <span className="sm:hidden">
              Group {selectedGroup?.id} — {sessionInfo ? formatShortDate(sessionInfo.session_date) : ''}
            </span>
            <span className="hidden sm:inline">
              Group {selectedGroup?.id} — {sessionInfo ? formatFullDate(sessionInfo.session_date) : ''}
            </span>
            {sessionInfo?.session_code && (
              <Badge variant="outline" className="hidden sm:inline-flex font-mono text-[10px] font-bold text-primary border-primary/30 shrink-0">
                {sessionInfo.session_code}
              </Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
            <Users className="h-3 w-3 shrink-0" />
            <span>{records.length} students · {selectedGroup?.class}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Save Button (to the left of Back) */}
          <Button
            onClick={handleSave}
            disabled={saving || recordsLoading}
            size="sm"
            className="h-8 w-8 p-0 sm:w-auto sm:px-3 text-xs gap-1.5 cursor-pointer shrink-0"
            title="Save All"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Save className="h-4 w-4 shrink-0" />}
            <span className="hidden sm:inline">Save All</span>
          </Button>

          {/* Back Button (at the right corner) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="h-8 w-8 p-0 sm:w-auto sm:px-3 text-xs gap-1.5 cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </div>
      </div>

      {/* Evaluation Records */}
      {recordsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* ─── DESKTOP VIEW (md: and above): All 3 entries unified on a single page ─── */}
          <div className="hidden md:block space-y-3">
            <Card className="border shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-3.5 px-4 sm:px-6 bg-muted/20 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold">Student Evaluations</CardTitle>
                  <CardDescription className="text-xs">Record Homework, Test Preparation, and Home Practice simultaneously</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
                  {records.length} Students
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[70vh]">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead className="bg-muted/80 sticky top-0 z-20 backdrop-blur-md border-b">
                      <tr>
                        {/* Student ID (Sticky) */}
                        <th className="p-3 font-semibold text-muted-foreground sticky left-0 z-30 bg-muted/95 min-w-[55px] sm:min-w-[60px] text-center border-r">
                          <button
                            type="button"
                            onClick={() => handleSort('id')}
                            className="inline-flex items-center justify-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors font-semibold"
                            title="Sort by Student ID"
                          >
                            <span>ID</span>
                            {sortColumn === 'id' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3 text-primary" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </th>

                        {/* Student Name (Sticky) */}
                        <th className="p-3 font-semibold text-muted-foreground sticky left-[55px] sm:left-[60px] z-30 bg-muted/95 min-w-[150px] sm:min-w-[200px] border-r">
                          <button
                            type="button"
                            onClick={() => handleSort('name')}
                            className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors font-semibold"
                            title="Sort by Student Name"
                          >
                            <span>Student Name</span>
                            {sortColumn === 'name' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3 text-primary" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </th>

                        {/* School Column (Desktop only) */}
                        <th className="p-3 font-semibold text-muted-foreground min-w-[140px] sm:min-w-[170px] border-r">
                          <button
                            type="button"
                            onClick={() => handleSort('school')}
                            className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors font-semibold"
                            title="Sort by School"
                          >
                            <span>School</span>
                            {sortColumn === 'school' ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3 text-primary" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </th>

                        {/* Homework */}
                        <th className="p-3 font-semibold text-muted-foreground min-w-[180px] sm:min-w-[200px] text-center border-r">
                          <button
                            type="button"
                            onClick={() => handleSort('homework')}
                            className="inline-flex flex-col items-center justify-center cursor-pointer select-none hover:text-foreground transition-colors group/sub mx-auto"
                            title="Sort by Homework status"
                          >
                            <div className="flex items-center gap-1 font-bold text-foreground text-sm tracking-tight">
                              <ClipboardCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span>Homework</span>
                              {sortColumn === 'homework' ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-primary shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-primary shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/sub:opacity-60 transition-opacity shrink-0" />
                              )}
                            </div>
                          </button>
                        </th>

                        {/* Test Prep */}
                        <th className="p-3 font-semibold text-muted-foreground min-w-[180px] sm:min-w-[200px] text-center border-r">
                          <button
                            type="button"
                            onClick={() => handleSort('test_prep')}
                            className="inline-flex flex-col items-center justify-center cursor-pointer select-none hover:text-foreground transition-colors group/sub mx-auto"
                            title="Sort by Test Prep status"
                          >
                            <div className="flex items-center gap-1 font-bold text-foreground text-sm tracking-tight">
                              <BookOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span>Test Prep</span>
                              {sortColumn === 'test_prep' ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-primary shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-primary shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/sub:opacity-60 transition-opacity shrink-0" />
                              )}
                            </div>
                          </button>
                        </th>

                        {/* Practice at Home */}
                        <th className="p-3 font-semibold text-muted-foreground min-w-[180px] sm:min-w-[200px] text-center border-r">
                          <button
                            type="button"
                            onClick={() => handleSort('practice')}
                            className="inline-flex flex-col items-center justify-center cursor-pointer select-none hover:text-foreground transition-colors group/sub mx-auto"
                            title="Sort by Practice status"
                          >
                            <div className="flex items-center gap-1 font-bold text-foreground text-sm tracking-tight">
                              <Home className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span>Practice at Home</span>
                              {sortColumn === 'practice' ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-3 w-3 text-primary shrink-0" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 text-primary shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-0 group-hover/sub:opacity-60 transition-opacity shrink-0" />
                              )}
                            </div>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedRecords.map((rec) => (
                        <tr key={rec.student_id} className="hover:bg-accent/40 transition-colors">
                          {/* Student ID (Sticky) */}
                          <td className="p-2.5 font-mono text-xs font-semibold sticky left-0 z-10 bg-background/95 border-r text-center">
                            {rec.student_id}
                          </td>

                          {/* Student Name (Sticky) */}
                          <td className="p-2.5 font-medium sticky left-[55px] sm:left-[60px] z-10 bg-background/95 border-r truncate max-w-[200px]">
                            <div className="truncate font-semibold text-foreground" title={rec.student_name}>
                              {rec.student_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Class: {getStudentClass(rec)}
                            </div>
                          </td>

                          {/* School Column (Desktop only) */}
                          <td className="p-2.5 border-r text-xs text-muted-foreground truncate max-w-[170px]" title={getStudentSchool(rec)}>
                            <span className="font-medium text-foreground/80">{getStudentSchool(rec)}</span>
                          </td>

                          {/* Homework Select */}
                          <td className="p-2 sm:p-2.5 border-r text-center">
                            <div className="w-[156px] sm:w-[166px] mx-auto">
                              <Select
                                value={rec.homework_status || ''}
                                onValueChange={(v) => updateRecord(rec.student_id, 'homework_status', v)}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {HW_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value!} value={opt.value!} className="text-xs">
                                      <span className={opt.color}>{opt.label}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </td>

                          {/* Test Prep Select */}
                          <td className="p-2 sm:p-2.5 border-r text-center">
                            <div className="w-[156px] sm:w-[166px] mx-auto">
                              <Select
                                value={rec.test_prep_status || ''}
                                onValueChange={(v) => updateRecord(rec.student_id, 'test_prep_status', v)}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {TP_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value!} value={opt.value!} className="text-xs">
                                      <span className={opt.color}>{opt.label}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </td>

                          {/* Practice at Home Select */}
                          <td className="p-2 sm:p-2.5 border-r text-center">
                            <div className="w-[156px] sm:w-[166px] mx-auto">
                              <Select
                                value={rec.practice_status || ''}
                                onValueChange={(v) => updateRecord(rec.student_id, 'practice_status', v)}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {PR_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value!} value={opt.value!} className="text-xs">
                                      <span className={opt.color}>{opt.label}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── RESPONSIVE / MOBILE VIEW (md:hidden): Segmented Toggle Pill + Student List ─── */}
          <div className="md:hidden space-y-3">
            {/* Segmented Toggle Bar */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 h-9 w-full max-w-sm mx-auto shadow-xs">
              <button
                type="button"
                data-slot="button"
                data-variant={activeTab === 'homework' ? 'default' : 'ghost'}
                data-size="sm"
                onClick={() => setActiveTab('homework')}
                className={`flex-1 inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 gap-1.5 rounded-md h-7 px-2 text-xs font-medium cursor-pointer select-none ${
                  activeTab === 'homework'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                    : 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 text-muted-foreground'
                }`}
              >
                <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
                <span>H.W.</span>
              </button>

              <button
                type="button"
                data-slot="button"
                data-variant={activeTab === 'test_prep' ? 'default' : 'ghost'}
                data-size="sm"
                onClick={() => setActiveTab('test_prep')}
                className={`flex-1 inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 gap-1.5 rounded-md h-7 px-2 text-xs font-medium cursor-pointer select-none ${
                  activeTab === 'test_prep'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                    : 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 text-muted-foreground'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span>Test Prep</span>
              </button>

              <button
                type="button"
                data-slot="button"
                data-variant={activeTab === 'practice' ? 'default' : 'ghost'}
                data-size="sm"
                onClick={() => setActiveTab('practice')}
                className={`flex-1 inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 gap-1.5 rounded-md h-7 px-2 text-xs font-medium cursor-pointer select-none ${
                  activeTab === 'practice'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
                    : 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 text-muted-foreground'
                }`}
              >
                <Home className="h-3.5 w-3.5 shrink-0" />
                <span>Practice</span>
              </button>
            </div>

            {/* Active Category Card for Mobile */}
            <Card className="border shadow-xs overflow-hidden">
              <CardHeader className="flex flex-col space-y-1.5 pb-2.5 px-3.5 pt-3 bg-muted/10">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    {activeTab === 'homework' && (
                      <>
                        <ClipboardCheck className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>Homework — Done or Not Done</span>
                      </>
                    )}
                    {activeTab === 'test_prep' && (
                      <>
                        <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />
                        <span>Test Prepared — Prepared or Not</span>
                      </>
                    )}
                    {activeTab === 'practice' && (
                      <>
                        <Home className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Practice at Home — Web & Grammar</span>
                      </>
                    )}
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 shrink-0">
                    {sortedRecords.length}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  {activeTab === 'homework' && "Mark each student's homework status"}
                  {activeTab === 'test_prep' && "Mark each student's test preparation status"}
                  {activeTab === 'practice' && "Mark each student's home practice status"}
                </CardDescription>
              </CardHeader>

              {/* Horizontal Separator */}
              <Separator />

              <CardContent className="px-3.5 pb-3 pt-2.5">
                <div className="divide-y divide-border/60">
                  {sortedRecords.map((rec) => (
                    <div key={rec.student_id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      {/* Only Name on Phone Screen Size (No serial number) */}
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium truncate block text-foreground" title={rec.student_name}>
                          {rec.student_name}
                        </span>
                      </div>

                      {activeTab === 'homework' && (
                        <Select
                          value={rec.homework_status || ''}
                          onValueChange={(v) => updateRecord(rec.student_id, 'homework_status', v)}
                        >
                          <SelectTrigger className="w-32 sm:w-36 h-8 text-xs shrink-0">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {HW_OPTIONS.map(opt => (
                              <SelectItem key={opt.value!} value={opt.value!} className="text-xs">
                                <span className={opt.color}>{opt.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {activeTab === 'test_prep' && (
                        <Select
                          value={rec.test_prep_status || ''}
                          onValueChange={(v) => updateRecord(rec.student_id, 'test_prep_status', v)}
                        >
                          <SelectTrigger className="w-32 sm:w-36 h-8 text-xs shrink-0">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TP_OPTIONS.map(opt => (
                              <SelectItem key={opt.value!} value={opt.value!} className="text-xs">
                                <span className={opt.color}>{opt.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {activeTab === 'practice' && (
                        <Select
                          value={rec.practice_status || ''}
                          onValueChange={(v) => updateRecord(rec.student_id, 'practice_status', v)}
                        >
                          <SelectTrigger className="w-32 sm:w-36 h-8 text-xs shrink-0">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PR_OPTIONS.map(opt => (
                              <SelectItem key={opt.value!} value={opt.value!} className="text-xs">
                                <span className={opt.color}>{opt.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Floating Save Button (mobile) */}
      {!recordsLoading && records.length > 0 && (
        <div className="fixed bottom-4 right-4 sm:hidden z-50">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="rounded-full shadow-lg h-12 w-12 p-0"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          </Button>
        </div>
      )}
    </div>
  );
}
