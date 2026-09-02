import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  fetchResultPeriod,
  fetchMarks,
  saveMarks,
  updateResultPeriod,
  type ResultPeriod,
  type StudentResult,
} from '@/lib/reports-api';
import { MONTH_NAMES } from '@/lib/constants';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Lock,
  User,
  Check,
  Layers,
  Copy,
  LayoutList,
  Table as TableIcon,
  ChevronsUpDown,
} from 'lucide-react';

export default function MarksEntryPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<ResultPeriod | null>(null);
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [initialStudentsJson, setInitialStudentsJson] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'accordion' | 'table'>('accordion');

  // Track expanded student dropdown states (studentResultId -> boolean)
  const [expandedStudents, setExpandedStudents] = useState<Record<number, boolean>>({});

  // Check unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!initialStudentsJson) return false;
    return JSON.stringify(students) !== initialStudentsJson;
  }, [students, initialStudentsJson]);

  // Warn before browser unload if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadData = useCallback(async () => {
    if (!periodId) return;
    setLoading(true);
    try {
      const pId = Number(periodId);
      const [periodData, marksData] = await Promise.all([
        fetchResultPeriod(pId),
        fetchMarks(pId),
      ]);
      setPeriod(periodData);
      setStudents(marksData);
      setInitialStudentsJson(JSON.stringify(marksData));

      // Expand the first student by default for quick entry
      if (marksData.length > 0) {
        setExpandedStudents({ [marksData[0].studentResultId]: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load marks';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subject headers (from first student or sorted)
  const subjects = useMemo(() => {
    if (students.length === 0) return [];
    return students[0].marks.map((m) => ({
      subjectId: m.subjectId,
      subjectName: m.subjectName,
      subjectCategory: m.subjectCategory,
      displayOrder: m.displayOrder,
      defaultMax: m.maxMarks,
    }));
  }, [students]);

  // Toggle single student dropdown
  const toggleStudentExpanded = (studentResultId: number) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [studentResultId]: !prev[studentResultId],
    }));
  };

  // Expand all / Collapse all
  const handleExpandAll = () => {
    const all: Record<number, boolean> = {};
    students.forEach((s) => {
      all[s.studentResultId] = true;
    });
    setExpandedStudents(all);
  };

  const handleCollapseAll = () => {
    setExpandedStudents({});
  };

  // Helper to check if a student has all marks filled
  const isStudentComplete = (student: StudentResult) => {
    if (student.status === 'Absent') return true;
    if (!student.marks || student.marks.length === 0) return false;
    return student.marks.every((m) => m.obtainedMarks !== null && m.obtainedMarks !== undefined);
  };

  // Live recalculate for a student row when obtained mark changes
  const updateStudentMark = (studentIndex: number, markIndex: number, valueStr: string) => {
    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const student = next[studentIndex];
      const mark = student.marks[markIndex];

      if (valueStr === '') {
        mark.obtainedMarks = null;
      } else {
        const num = parseFloat(valueStr);
        if (isNaN(num)) return prev;
        if (num < 0) {
          toast.error('Marks cannot be negative');
          return prev;
        }
        if (num > mark.maxMarks) {
          toast.error(`Marks cannot exceed maximum (${mark.maxMarks})`);
          return prev;
        }
        mark.obtainedMarks = num;
      }

      // Compute total obtained and percentage
      if (student.status === 'Absent') {
        student.totalObtained = null;
        student.totalMax = null;
        student.percentage = null;
      } else {
        let totalObt = 0;
        let totalMax = 0;
        let hasAnyMark = false;

        for (const m of student.marks) {
          totalMax += m.maxMarks;
          if (m.obtainedMarks !== null) {
            totalObt += m.obtainedMarks;
            hasAnyMark = true;
          }
        }

        student.totalObtained = hasAnyMark ? totalObt : null;
        student.totalMax = totalMax;
        student.percentage =
          hasAnyMark && totalMax > 0 ? parseFloat(((totalObt / totalMax) * 100).toFixed(2)) : null;
      }

      return next;
    });
  };

  // Live update for manual maximum marks of a subject for a student
  const updateStudentMaxMark = (studentIndex: number, markIndex: number, maxStr: string) => {
    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const student = next[studentIndex];
      const mark = student.marks[markIndex];

      const num = parseInt(maxStr, 10);
      if (isNaN(num) || num <= 0) return prev;

      mark.maxMarks = num;
      mark.isDefaultMax = false;

      // Adjust obtained if it now exceeds max
      if (mark.obtainedMarks !== null && mark.obtainedMarks > num) {
        mark.obtainedMarks = num;
      }

      // Recompute totals
      if (student.status !== 'Absent') {
        let totalObt = 0;
        let totalMax = 0;
        let hasAnyMark = false;

        for (const m of student.marks) {
          totalMax += m.maxMarks;
          if (m.obtainedMarks !== null) {
            totalObt += m.obtainedMarks;
            hasAnyMark = true;
          }
        }

        student.totalObtained = hasAnyMark ? totalObt : null;
        student.totalMax = totalMax;
        student.percentage =
          hasAnyMark && totalMax > 0 ? parseFloat(((totalObt / totalMax) * 100).toFixed(2)) : null;
      }

      return next;
    });
  };

  const updateStudentStatus = (studentIndex: number, newStatus: 'Present' | 'Absent' | 'Incomplete') => {
    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const student = next[studentIndex];
      student.status = newStatus;

      if (newStatus === 'Absent') {
        student.totalObtained = null;
        student.totalMax = null;
        student.percentage = null;
        student.classRank = null;
        student.groupRank = null;
      } else {
        let totalObt = 0;
        let totalMax = 0;
        let hasAnyMark = false;

        for (const m of student.marks) {
          totalMax += m.maxMarks;
          if (m.obtainedMarks !== null) {
            totalObt += m.obtainedMarks;
            hasAnyMark = true;
          }
        }

        student.totalObtained = hasAnyMark ? totalObt : null;
        student.totalMax = totalMax;
        student.percentage =
          hasAnyMark && totalMax > 0 ? parseFloat(((totalObt / totalMax) * 100).toFixed(2)) : null;
      }

      return next;
    });
  };

  // "Done / Close" button handler for a student: collapses current student and opens the next one
  const handleDoneStudent = (currentStudentResultId: number, currentFilteredIndex: number) => {
    setExpandedStudents((prev) => {
      const updated = { ...prev, [currentStudentResultId]: false };

      // Find next student in filtered list
      const nextStudent = filteredStudents[currentFilteredIndex + 1];
      if (nextStudent) {
        updated[nextStudent.studentResultId] = true;
      }

      return updated;
    });

    toast.success('Marks recorded for this student');
  };

  // Copy max marks from one student to all other students
  const handleCopyMaxMarksToAll = (sourceStudent: StudentResult) => {
    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const sourceMaxMap = new Map<number, number>();
      sourceStudent.marks.forEach((m) => sourceMaxMap.set(m.subjectId, m.maxMarks));

      for (const st of next) {
        for (const m of st.marks) {
          const srcMax = sourceMaxMap.get(m.subjectId);
          if (srcMax) {
            m.maxMarks = srcMax;
            if (m.obtainedMarks !== null && m.obtainedMarks > srcMax) {
              m.obtainedMarks = srcMax;
            }
          }
        }

        // Recompute student totals
        if (st.status !== 'Absent') {
          let totalObt = 0;
          let totalMax = 0;
          let hasAnyMark = false;

          for (const m of st.marks) {
            totalMax += m.maxMarks;
            if (m.obtainedMarks !== null) {
              totalObt += m.obtainedMarks;
              hasAnyMark = true;
            }
          }

          st.totalObtained = hasAnyMark ? totalObt : null;
          st.totalMax = totalMax;
          st.percentage =
            hasAnyMark && totalMax > 0 ? parseFloat(((totalObt / totalMax) * 100).toFixed(2)) : null;
        }
      }

      return next;
    });

    toast.success(`Copied maximum marks from ${sourceStudent.name} to all students in this group`);
  };

  const handleSave = async () => {
    if (!periodId) return;
    setSaving(true);
    try {
      const payload = students.map((s) => ({
        studentResultId: s.studentResultId,
        status: s.status,
        marks: s.marks.map((m) => ({
          markId: m.markId,
          obtainedMarks: m.obtainedMarks,
          maxMarks: m.maxMarks,
          isDefaultMax: m.isDefaultMax,
        })),
      }));

      await saveMarks(Number(periodId), payload);
      toast.success('All student marks saved and rankings recalculated successfully!');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save marks';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!periodId) return;
    try {
      await updateResultPeriod(Number(periodId), { status: 'Published' });
      toast.success('Result published and finalized');
      setPublishDialogOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish';
      toast.error(msg);
    }
  };

  const handleRevertToDraft = async () => {
    if (!periodId) return;
    try {
      await updateResultPeriod(Number(periodId), { status: 'Draft' });
      toast.success('Result reverted to Draft');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revert';
      toast.error(msg);
    }
  };

  // Filtered view of students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.school.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (filterStatus === 'pending') {
        matchesStatus = !isStudentComplete(s);
      } else if (filterStatus === 'completed') {
        matchesStatus = isStudentComplete(s);
      } else if (filterStatus === 'absent') {
        matchesStatus = s.status === 'Absent';
      } else if (filterStatus === 'present') {
        matchesStatus = s.status === 'Present';
      }

      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, filterStatus]);

  const completedCount = useMemo(() => students.filter(isStudentComplete).length, [students]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!period) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-lg font-bold">Result Period Not Found</h2>
        <Button onClick={() => navigate('/reports/monthly')}>Back to Results</Button>
      </div>
    );
  }

  const isPublished = period.status === 'Published';

  return (
    <div className="page-enter p-4 sm:p-6 space-y-6 w-full">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
              {MONTH_NAMES[period.month] || period.month} {period.academic_year} Marks Entry
            </h1>
            <Badge
              variant={isPublished ? 'default' : period.status === 'Completed' ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {period.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {period.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group {period.group_id} {period.group_class ? `(${period.group_class})` : ''} ·{' '}
            <span className="font-semibold text-foreground">
              {completedCount} of {students.length} completed
            </span>
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {hasUnsavedChanges && (
            <Badge variant="destructive" className="animate-pulse text-xs">
              Unsaved Changes
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={loadData} disabled={saving} className="text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>

          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs min-w-[90px]">
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? 'Saving...' : 'Save Marks'}
          </Button>

          {!isPublished ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPublishDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Finalize
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleRevertToDraft} className="text-xs">
              <Lock className="h-3.5 w-3.5 mr-1" />
              Revert to Draft
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (hasUnsavedChanges) {
                if (window.confirm('You have unsaved changes. Do you really want to leave?')) {
                  navigate('/reports/monthly');
                }
              } else {
                navigate('/reports/monthly');
              }
            }}
            className="text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>
        </div>
      </div>

      {/* Filter and View Mode Toolbar */}
      <Card className="border shadow-xs">
        <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row items-center gap-3 justify-between">
          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student name, ID, school..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs sm:text-sm h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Filter Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students ({students.length})</SelectItem>
                <SelectItem value="pending">Pending ({students.length - completedCount})</SelectItem>
                <SelectItem value="completed">Completed ({completedCount})</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="present">Present</SelectItem>
              </SelectContent>
            </Select>

            {/* Expand / Collapse All (in Accordion View) */}
            {viewMode === 'accordion' && (
              <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/40">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExpandAll}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Expand All
                </Button>
                <span className="text-muted-foreground/40 text-xs">|</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCollapseAll}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Collapse All
                </Button>
              </div>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
              <Button
                variant={viewMode === 'accordion' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('accordion')}
                className="h-7 px-2.5 text-xs"
              >
                <LayoutList className="h-3.5 w-3.5 mr-1" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-7 px-2.5 text-xs"
              >
                <TableIcon className="h-3.5 w-3.5 mr-1" />
                Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── VIEW MODE 1: ACCORDION / RESPONSIVE DROPDOWN STUDENT CARDS (DEFAULT) ─── */}
      {viewMode === 'accordion' && (
        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No students matched your search/filter criteria.</p>
            </Card>
          ) : (
            filteredStudents.map((student, filteredIdx) => {
              const originalIndex = students.findIndex(
                (s) => s.studentResultId === student.studentResultId
              );
              const isExpanded = !!expandedStudents[student.studentResultId];
              const isAbsent = student.status === 'Absent';
              const complete = isStudentComplete(student);

              return (
                <Card
                  key={student.studentResultId}
                  className={`border transition-all duration-200 overflow-hidden shadow-xs ${
                    isExpanded
                      ? 'ring-2 ring-primary/40 border-primary/50 shadow-md'
                      : 'hover:border-border'
                  } ${isAbsent ? 'bg-destructive/[0.02] border-destructive/20' : ''}`}
                >
                  {/* Student Header Card (Click to Expand / Collapse Dropdown) */}
                  <div
                    onClick={() => toggleStudentExpanded(student.studentResultId)}
                    className="p-3.5 sm:p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none bg-card hover:bg-accent/30 transition-colors"
                  >
                    {/* Left: Student Identity */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isAbsent
                            ? 'bg-destructive/10 text-destructive'
                            : complete
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {complete && !isAbsent ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          student.studentId.slice(-3)
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-foreground truncate">
                            {student.name}
                          </span>
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                            {student.studentId}
                          </span>
                          {complete && !isAbsent && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Class: {student.class || '—'}</span>
                          <span>•</span>
                          <span className="truncate max-w-[160px]">{student.school || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Scores & Expand Dropdown Trigger */}
                    <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                      {/* Score Preview Pill */}
                      <div className="flex items-center gap-2">
                        {isAbsent ? (
                          <Badge variant="destructive" className="text-xs">
                            ABSENT
                          </Badge>
                        ) : student.totalObtained !== null ? (
                          <div className="text-right">
                            <div className="font-mono font-bold text-xs sm:text-sm text-foreground">
                              {student.totalObtained} / {student.totalMax}
                            </div>
                            <div
                              className={`text-[11px] font-mono font-bold ${
                                (student.percentage || 0) >= 75
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : (student.percentage || 0) < 40
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {student.percentage?.toFixed(2)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Marks not entered</span>
                        )}
                      </div>

                      {/* Dropdown Chevron Button */}
                      <div className="p-1 rounded-md text-muted-foreground hover:bg-muted">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-primary" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ─── EXPANDED DOWN SIDE: SUBJECT MARKS ENTRY FORM ─── */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 border-t bg-muted/15 space-y-5 animate-fade-in">
                      {/* Sub-header inside dropdown: Status & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Student Status:
                          </label>
                          <Select
                            value={student.status}
                            onValueChange={(val: 'Present' | 'Absent' | 'Incomplete') =>
                              updateStudentStatus(originalIndex, val)
                            }
                          >
                            <SelectTrigger
                              className={`h-8 text-xs font-semibold w-[130px] ${
                                isAbsent
                                  ? 'border-destructive text-destructive bg-destructive/10'
                                  : 'bg-background'
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Present">Present</SelectItem>
                              <SelectItem value="Absent">Absent</SelectItem>
                              <SelectItem value="Incomplete">Incomplete</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Helper to copy max marks to other students */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyMaxMarksToAll(student)}
                          className="text-xs text-muted-foreground hover:text-foreground h-8"
                          title="Apply this student's maximum marks pattern to all students in this group"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Apply these Max Marks to all
                        </Button>
                      </div>

                      {/* Subject Marks Entry Grid (Responsive: 1 col on mobile, 2 on tablet, 3 on desktop) */}
                      {isAbsent ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-destructive/30 bg-destructive/5 text-destructive text-sm font-medium">
                          Student is marked as Absent. Marks entry is disabled for this period.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {student.marks.map((mark, markIdx) => {
                            const isExceeded =
                              mark.obtainedMarks !== null && mark.obtainedMarks > mark.maxMarks;
                            const isFilled = mark.obtainedMarks !== null;

                            return (
                              <div
                                key={mark.markId}
                                className={`p-3.5 rounded-xl border transition-all ${
                                  isExceeded
                                    ? 'border-destructive bg-destructive/5'
                                    : isFilled
                                    ? 'border-emerald-500/30 bg-card'
                                    : 'border-border bg-card'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-bold text-xs sm:text-sm text-foreground">
                                    {mark.subjectName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                    {mark.subjectCategory}
                                  </span>
                                </div>

                                {/* Inputs Row: Obtained Marks & Manual Maximum Marks */}
                                <div className="flex items-center gap-2">
                                  {/* Obtained Marks Input */}
                                  <div className="flex-1">
                                    <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                                      Marks Obtained
                                    </label>
                                    <Input
                                      type="number"
                                      step="any"
                                      min={0}
                                      max={mark.maxMarks}
                                      placeholder="0"
                                      value={mark.obtainedMarks !== null ? mark.obtainedMarks : ''}
                                      onChange={(e) =>
                                        updateStudentMark(originalIndex, markIdx, e.target.value)
                                      }
                                      className={`h-9 font-mono font-bold text-sm text-center ${
                                        isExceeded
                                          ? 'border-destructive text-destructive ring-1 ring-destructive'
                                          : isFilled
                                          ? 'border-emerald-500/50'
                                          : ''
                                      }`}
                                    />
                                  </div>

                                  <div className="text-muted-foreground font-bold text-sm pt-4">/</div>

                                  {/* Manual Maximum Marks Input (per student per subject!) */}
                                  <div className="w-20">
                                    <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                                      Max Marks
                                    </label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={200}
                                      value={mark.maxMarks}
                                      onChange={(e) =>
                                        updateStudentMaxMark(originalIndex, markIdx, e.target.value)
                                      }
                                      className="h-9 font-mono text-xs text-center bg-muted/30"
                                      title="You can manually adjust maximum marks for this student"
                                    />
                                  </div>
                                </div>

                                {isExceeded && (
                                  <p className="text-[10px] text-destructive font-semibold mt-1">
                                    Cannot exceed max ({mark.maxMarks})
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Dropdown Footer: Live Calculated Results & Done/Close Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
                        {/* Live Total & Percentage Summary */}
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-muted-foreground">Total Obtained: </span>
                            <strong className="text-sm font-bold">
                              {student.totalObtained !== null ? student.totalObtained : '—'}
                            </strong>
                            <span className="text-muted-foreground"> / {student.totalMax}</span>
                          </div>

                          <div>
                            <span className="text-muted-foreground">Percentage: </span>
                            <strong
                              className={`text-sm font-bold ${
                                (student.percentage || 0) >= 75
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : ''
                              }`}
                            >
                              {student.percentage !== null
                                ? `${student.percentage.toFixed(2)}%`
                                : '—'}
                            </strong>
                          </div>
                        </div>

                        {/* Close Dropdown & Move to Next Student Button */}
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDoneStudent(student.studentResultId, filteredIdx)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-9 px-4"
                          >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Done & Next Student
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─── VIEW MODE 2: SPREADSHEET TABLE VIEW (OPTIONAL COMPACT ALTERNATIVE) ─── */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden border shadow-sm">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-muted/80 sticky top-0 z-20 backdrop-blur-md border-b">
                <tr>
                  <th className="p-3 font-semibold text-muted-foreground sticky left-0 z-30 bg-muted/95 min-w-[70px] border-r">
                    Roll / ID
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground sticky left-[70px] z-30 bg-muted/95 min-w-[140px] sm:min-w-[180px] border-r">
                    Student Name
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground min-w-[110px] border-r">
                    School
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground min-w-[100px] border-r text-center">
                    Status
                  </th>

                  {/* Subject Columns */}
                  {subjects.map((sub) => (
                    <th
                      key={sub.subjectId}
                      className="p-3 font-semibold text-muted-foreground min-w-[110px] text-center border-r"
                    >
                      <div>{sub.subjectName}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        Default: {sub.defaultMax}
                      </div>
                    </th>
                  ))}

                  <th className="p-3 font-semibold text-muted-foreground min-w-[90px] text-center border-r bg-muted/60">
                    Total
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground min-w-[90px] text-center border-r bg-muted/60">
                    %
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground min-w-[70px] text-center bg-muted/60">
                    Rank
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6 + subjects.length}
                      className="text-center p-8 text-muted-foreground"
                    >
                      No students match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const originalIndex = students.findIndex(
                      (s) => s.studentResultId === student.studentResultId
                    );
                    const isAbsent = student.status === 'Absent';

                    return (
                      <tr
                        key={student.studentResultId}
                        className={`hover:bg-accent/40 transition-colors ${
                          isAbsent ? 'bg-destructive/5 text-muted-foreground' : ''
                        }`}
                      >
                        {/* Student ID (Sticky) */}
                        <td className="p-2.5 font-mono text-xs font-semibold sticky left-0 z-10 bg-background/95 border-r">
                          {student.studentId}
                        </td>

                        {/* Student Name (Sticky) */}
                        <td className="p-2.5 font-medium sticky left-[70px] z-10 bg-background/95 border-r truncate max-w-[180px]">
                          <div className="truncate font-semibold">{student.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Class: {student.class || '—'}
                          </div>
                        </td>

                        {/* School */}
                        <td className="p-2.5 text-xs text-muted-foreground border-r truncate max-w-[120px]">
                          {student.school || '—'}
                        </td>

                        {/* Status Selector */}
                        <td className="p-2 text-center border-r">
                          <Select
                            value={student.status}
                            onValueChange={(val: 'Present' | 'Absent' | 'Incomplete') =>
                              updateStudentStatus(originalIndex, val)
                            }
                          >
                            <SelectTrigger
                              className={`h-8 text-xs font-medium w-full ${
                                isAbsent
                                  ? 'border-destructive text-destructive bg-destructive/10'
                                  : 'bg-background'
                              }`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Present">Present</SelectItem>
                              <SelectItem value="Absent">Absent</SelectItem>
                              <SelectItem value="Incomplete">Incomplete</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Subject Mark Inputs with direct manual max marks */}
                        {student.marks.map((mark, markIdx) => {
                          return (
                            <td key={mark.markId} className="p-2 border-r text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Input
                                  type="number"
                                  step="any"
                                  min={0}
                                  max={mark.maxMarks}
                                  disabled={isAbsent}
                                  placeholder="—"
                                  value={mark.obtainedMarks !== null ? mark.obtainedMarks : ''}
                                  onChange={(e) =>
                                    updateStudentMark(originalIndex, markIdx, e.target.value)
                                  }
                                  className={`h-8 w-14 text-center font-mono text-xs px-1 ${
                                    mark.obtainedMarks !== null &&
                                    mark.obtainedMarks > mark.maxMarks
                                      ? 'border-destructive text-destructive ring-1 ring-destructive'
                                      : ''
                                  }`}
                                />
                                <span className="text-muted-foreground text-[10px]">/</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={200}
                                  disabled={isAbsent}
                                  value={mark.maxMarks}
                                  onChange={(e) =>
                                    updateStudentMaxMark(originalIndex, markIdx, e.target.value)
                                  }
                                  className="h-8 w-12 text-center font-mono text-[11px] px-0.5 bg-muted/40"
                                  title="Maximum marks for this student"
                                />
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Obtained */}
                        <td className="p-2.5 text-center font-mono font-bold border-r bg-muted/20">
                          {isAbsent ? (
                            '—'
                          ) : student.totalObtained !== null ? (
                            <span>
                              {student.totalObtained}{' '}
                              <span className="text-[10px] text-muted-foreground font-normal">
                                / {student.totalMax}
                              </span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Percentage */}
                        <td className="p-2.5 text-center font-mono font-bold border-r bg-muted/20">
                          {isAbsent ? (
                            '—'
                          ) : student.percentage !== null ? (
                            <span
                              className={
                                student.percentage >= 75
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : student.percentage < 40
                                  ? 'text-destructive'
                                  : ''
                              }
                            >
                              {student.percentage.toFixed(2)}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Rank */}
                        <td className="p-2.5 text-center font-mono font-semibold bg-muted/20">
                          {isAbsent ? (
                            '—'
                          ) : student.groupRank ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              #{student.groupRank}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Publish Confirmation Dialog */}
      <ConfirmDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        title="Finalize & Publish Results"
        description="Publishing will mark this result period as finalized. Report cards will be accessible for printing and students/parents viewing. You can still unlock it later if revisions are needed."
        actionLabel="Publish Results"
        onConfirm={handlePublish}
        variant="default"
      />
    </div>
  );
}
