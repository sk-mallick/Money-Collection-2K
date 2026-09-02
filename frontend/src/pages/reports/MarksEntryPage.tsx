import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  type StudentMark,
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
  X,
  Filter,
  UserX,
  UserCheck,
} from 'lucide-react';

// ─── UNIFIED MARKS DROPDOWN + MANUAL INPUT COMPONENT ─────────────────────────────
interface MarksDropdownInputProps {
  obtainedMarks: number | null;
  isAbsent: boolean;
  maxMarks: number;
  onChange: (obtainedMarks: number | null, isAbsent: boolean) => void;
  className?: string;
  isTable?: boolean;
}

function MarksDropdownInput({
  obtainedMarks,
  isAbsent,
  maxMarks,
  onChange,
  className = '',
  isTable = false,
}: MarksDropdownInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal display value with current props
  useEffect(() => {
    if (isAbsent) {
      setInputValue('Absent');
    } else if (obtainedMarks !== null && obtainedMarks !== undefined) {
      setInputValue(String(obtainedMarks));
    } else {
      setInputValue('');
    }
  }, [obtainedMarks, isAbsent]);

  // Click outside listener to close dropdown menu & smart placement check
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Determine if dropdown should flip upwards to prevent overlapping / clipping
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 200 && spaceAbove > 150) {
          setOpenUpwards(true);
        } else {
          setOpenUpwards(false);
        }
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const trimmed = val.trim().toLowerCase();
    if (trimmed === 'a' || trimmed === 'absent') {
      onChange(null, true);
    } else if (trimmed === '') {
      onChange(null, false);
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        if (num > maxMarks) {
          toast.error(`Marks cannot exceed maximum (${maxMarks})`);
        }
        onChange(num, false);
      }
    }
  };

  const handleSelectAbsent = () => {
    onChange(null, true);
    setIsOpen(false);
  };

  const handleSelectNumber = (num: number) => {
    onChange(num, false);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null, false);
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Generate integer dropdown options (from maxMarks down to 0)
  const numberOptions = useMemo(() => {
    const max = Math.min(Math.max(1, maxMarks), 100);
    const list: number[] = [];
    for (let i = max; i >= 0; i--) {
      list.push(i);
    }
    return list;
  }, [maxMarks]);

  const isExceeded = !isAbsent && obtainedMarks !== null && obtainedMarks > maxMarks;

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      <div
        className={`flex items-center rounded-md border transition-all ${
          isAbsent
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : isExceeded
            ? 'border-destructive bg-destructive/5 ring-1 ring-destructive'
            : obtainedMarks !== null
            ? 'border-emerald-500/40 bg-emerald-500/[0.02]'
            : 'border-input bg-card'
        }`}
      >
        {isAbsent ? (
          /* When Absent: Click to open dropdown or edit */
          <div
            onClick={() => setIsOpen(!isOpen)}
            className={`flex-1 flex items-center justify-between px-2 cursor-pointer select-none ${
              isTable ? 'h-8 text-xs' : 'h-9 text-sm'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold font-mono">
              <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
              {/* Desktop shows 'Absent', Responsive shows 'A' */}
              <span className="hidden sm:inline text-destructive">Absent</span>
              <span className="sm:hidden font-black text-destructive">A</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-destructive/70 ml-1" />
          </div>
        ) : (
          /* Number Input with Chevron Dropdown Trigger */
          <div className="flex items-center w-full">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={inputValue}
              onChange={handleInputChange}
              className={`w-full font-mono font-bold text-center bg-transparent outline-none ${
                isTable ? 'h-8 text-xs px-1' : 'h-9 text-sm px-2'
              }`}
            />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="px-1.5 py-1 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none shrink-0"
              title="Select marks or Absent"
              tabIndex={-1}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Floating Compact Dropdown Menu for Marks & Absent (Smart auto-flip up/down) */}
      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-full min-w-[70px] bg-popover text-popover-foreground border rounded-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: '180px' }}
        >
          {/* Top Option: Absent */}
          <div className="p-0.5 border-b bg-destructive/5">
            <button
              type="button"
              onClick={handleSelectAbsent}
              className="w-full text-center py-1 rounded text-xs font-bold text-destructive hover:bg-destructive/15 transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">Absent</span>
              <span className="sm:hidden">A</span>
            </button>
          </div>

          {/* Clean Number List */}
          <div className="overflow-y-auto max-h-[120px] p-0.5 divide-y divide-border/20">
            {numberOptions.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleSelectNumber(num)}
                className={`w-full text-center py-1 text-xs font-mono rounded hover:bg-accent transition-colors cursor-pointer ${
                  !isAbsent && obtainedMarks === num
                    ? 'bg-primary/15 text-primary font-bold'
                    : ''
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Bottom Option: Clear */}
          <div className="p-0.5 border-t bg-muted/20">
            <button
              type="button"
              onClick={handleClear}
              className="w-full text-center py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN MARKS ENTRY PAGE ───────────────────────────────────────────────────
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
  const [viewMode, setViewModeState] = useState<'accordion' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('marks_entry_view_mode');
      if (saved === 'table' || saved === 'accordion') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'accordion';
  });

  const setViewMode = (mode: 'accordion' | 'table') => {
    setViewModeState(mode);
    try {
      localStorage.setItem('marks_entry_view_mode', mode);
    } catch {
      // Ignore localStorage errors
    }
  };

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

  // Subject headers
  const subjects = useMemo(() => {
    if (students.length === 0) return [];
    return students[0].marks.map((m) => ({
      subjectId: m.subjectId,
      subjectName: m.subjectName,
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

  // Helper to recalculate student statistics
  const recalculateStudentStats = (student: StudentResult) => {
    const totalSubjects = student.marks.length;
    if (totalSubjects === 0) return;

    let absentCount = 0;
    let enteredCount = 0;
    let totalObt = 0;
    let totalMax = 0;

    for (const m of student.marks) {
      totalMax += m.maxMarks;
      if (m.isAbsent) {
        absentCount++;
        enteredCount++;
      } else if (m.obtainedMarks !== null && m.obtainedMarks !== undefined) {
        enteredCount++;
        totalObt += m.obtainedMarks;
      }
    }

    if (enteredCount === 0) {
      student.status = 'Incomplete';
      student.totalObtained = null;
      student.totalMax = totalMax;
      student.percentage = null;
    } else if (absentCount === totalSubjects) {
      student.status = 'Absent';
      student.totalObtained = null;
      student.totalMax = totalMax;
      student.percentage = null;
      student.classRank = null;
      student.groupRank = null;
    } else {
      student.status = enteredCount === totalSubjects ? 'Present' : 'Incomplete';
      student.totalObtained = totalObt;
      student.totalMax = totalMax;
      student.percentage = totalMax > 0 ? parseFloat(((totalObt / totalMax) * 100).toFixed(2)) : null;
    }
  };

  // Helper to check if a student has all marks filled or marked absent
  const isStudentComplete = (student: StudentResult) => {
    if (student.status === 'Absent') return true;
    if (!student.marks || student.marks.length === 0) return false;
    return student.marks.every(
      (m) => m.isAbsent || (m.obtainedMarks !== null && m.obtainedMarks !== undefined)
    );
  };

  // Update mark via dropdown / manual input
  const updateSubjectValue = (
    studentIndex: number,
    markIndex: number,
    obtainedMarks: number | null,
    isAbsent: boolean
  ) => {
    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const student = next[studentIndex];
      const mark = student.marks[markIndex];

      mark.obtainedMarks = obtainedMarks;
      mark.isAbsent = isAbsent;

      recalculateStudentStats(student);
      return next;
    });
  };

  // Batch toggle all subjects for a student (Mark All Absent / Mark All Present)
  const markAllSubjectsForStudent = (studentIndex: number, isAbsent: boolean) => {
    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const student = next[studentIndex];

      student.marks.forEach((m) => {
        m.isAbsent = isAbsent;
        if (isAbsent) {
          m.obtainedMarks = null;
        }
      });

      recalculateStudentStats(student);
      return next;
    });

    toast.info(
      isAbsent
        ? 'All subjects marked as Absent for this student'
        : 'All subjects marked as Present.'
    );
  };

  // Clear all marks for a student
  const clearAllMarksForStudent = (studentIndex: number) => {
    setStudents((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as StudentResult[];
      const student = next[studentIndex];

      student.marks.forEach((m) => {
        m.isAbsent = false;
        m.obtainedMarks = null;
      });

      recalculateStudentStats(student);
      return next;
    });

    toast.info('Cleared marks for this student');
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

      recalculateStudentStats(student);
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

        recalculateStudentStats(st);
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
          isAbsent: m.isAbsent,
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

      const absentCount = s.marks.filter((m) => m.isAbsent).length;
      const totalSubjects = s.marks.length;

      let matchesStatus = true;
      if (filterStatus === 'pending') {
        matchesStatus = !isStudentComplete(s);
      } else if (filterStatus === 'completed') {
        matchesStatus = isStudentComplete(s);
      } else if (filterStatus === 'present_full') {
        matchesStatus = isStudentComplete(s) && absentCount === 0;
      } else if (filterStatus === 'partial_absent') {
        matchesStatus = absentCount > 0 && absentCount < totalSubjects;
      } else if (filterStatus === 'all_absent') {
        matchesStatus = s.status === 'Absent' || (totalSubjects > 0 && absentCount === totalSubjects);
      }

      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, filterStatus]);

  const completedCount = useMemo(() => students.filter(isStudentComplete).length, [students]);

  const fullyAbsentCount = useMemo(
    () =>
      students.filter(
        (s) => s.status === 'Absent' || (s.marks.length > 0 && s.marks.every((m) => m.isAbsent))
      ).length,
    [students]
  );

  const partialAbsentCount = useMemo(
    () =>
      students.filter((s) => {
        const abs = s.marks.filter((m) => m.isAbsent).length;
        return abs > 0 && abs < s.marks.length;
      }).length,
    [students]
  );

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
    <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 w-full max-w-[99vw] 2xl:max-w-[1850px] mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-4 rounded-xl border shadow-xs w-full">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground">
              {MONTH_NAMES[period.month] || period.month} {period.academic_year} Marks Entry
            </h1>
            <Badge
              variant={isPublished ? 'default' : period.status === 'Completed' ? 'secondary' : 'outline'}
              className="text-xs font-semibold uppercase tracking-wider"
            >
              {period.status}
            </Badge>
            <Badge variant="outline" className="text-xs font-semibold">
              {period.category}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <span>
              Group <strong className="text-foreground">{period.group_id}</strong>{' '}
              {period.group_class ? `(${period.group_class})` : ''}
            </span>
            <span>•</span>
            <span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{completedCount}</strong> of{' '}
              {students.length} completed
            </span>
            {partialAbsentCount > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {partialAbsentCount} partial absent
                </span>
              </>
            )}
            {fullyAbsentCount > 0 && (
              <>
                <span>•</span>
                <span className="text-destructive font-semibold">{fullyAbsentCount} all absent</span>
              </>
            )}
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {hasUnsavedChanges && (
            <Badge variant="destructive" className="animate-pulse text-xs font-bold px-2.5 py-1">
              Unsaved Changes
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={loadData} disabled={saving} className="text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs min-w-[95px] font-bold shadow-xs bg-primary hover:bg-primary/90 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? 'Saving...' : 'Save Marks'}
          </Button>

          {!isPublished ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPublishDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
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

      {/* Search, Filter, and View Mode Toolbar */}
      <div className="space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3 justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student name, roll number, school..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs sm:text-sm h-9 bg-card"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="flex-1 sm:flex-initial w-auto sm:w-[175px] text-xs sm:text-sm h-9 bg-card">
                <SelectValue placeholder="Filter Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students ({students.length})</SelectItem>
                <SelectItem value="pending">Pending ({students.length - completedCount})</SelectItem>
                <SelectItem value="completed">Completed ({completedCount})</SelectItem>
                <SelectItem value="present_full">All Present</SelectItem>
                <SelectItem value="partial_absent">Partial Absent ({partialAbsentCount})</SelectItem>
                <SelectItem value="all_absent">All Absent ({fullyAbsentCount})</SelectItem>
              </SelectContent>
            </Select>

            {/* Expand / Collapse All (in Accordion View) */}
            {viewMode === 'accordion' && (
              <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/40 h-9">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExpandAll}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                >
                  Expand All
                </Button>
                <span className="text-muted-foreground/40 text-xs">|</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCollapseAll}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                >
                  Collapse All
                </Button>
              </div>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 h-9">
              <Button
                variant={viewMode === 'accordion' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('accordion')}
                className="h-7 px-2.5 text-xs font-medium cursor-pointer"
              >
                <LayoutList className="h-3.5 w-3.5 mr-1" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-7 px-2.5 text-xs font-medium cursor-pointer"
              >
                <TableIcon className="h-3.5 w-3.5 mr-1" />
                Table
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        {(searchTerm.trim() !== '' || filterStatus !== 'all') && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-muted/30 border text-xs animate-in fade-in duration-200">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Active Filters:</span>
            </span>

            {/* Search chip */}
            {searchTerm.trim() !== '' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-primary/10 text-primary border-primary/20"
              >
                <span>Search: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="rounded-full p-0.5 hover:bg-primary/20 cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Status chip */}
            {filterStatus !== 'all' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              >
                <span>
                  Filter:{' '}
                  {filterStatus === 'present_full'
                    ? 'All Present'
                    : filterStatus === 'partial_absent'
                    ? 'Partial Absent'
                    : filterStatus === 'all_absent'
                    ? 'All Absent'
                    : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                </span>
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className="rounded-full p-0.5 hover:bg-blue-500/20 cursor-pointer"
                  title="Clear status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Reset button */}
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer font-semibold"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>Reset All</span>
            </Button>

            <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">
              Showing <strong className="text-foreground font-bold">{filteredStudents.length}</strong> of{' '}
              {students.length} students
            </span>
          </div>
        )}
      </div>

      {/* ─── VIEW MODE 1: ACCORDION / RESPONSIVE STUDENT CARDS (DEFAULT) ─── */}
      {viewMode === 'accordion' && (
        <div className="space-y-3.5">
          {filteredStudents.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground bg-card">
              <Search className="h-9 w-9 mx-auto mb-2.5 opacity-40 text-muted-foreground" />
              <p className="text-sm font-semibold">No students matched your search or filter criteria.</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search terms or clearing active filters.</p>
            </Card>
          ) : (
            filteredStudents.map((student, filteredIdx) => {
              const originalIndex = students.findIndex(
                (s) => s.studentResultId === student.studentResultId
              );
              const isExpanded = !!expandedStudents[student.studentResultId];
              const complete = isStudentComplete(student);

              const absentCount = student.marks.filter((m) => m.isAbsent).length;
              const isAllAbsent = student.marks.length > 0 && absentCount === student.marks.length;
              const isPartialAbsent = absentCount > 0 && absentCount < student.marks.length;

              return (
                <Card
                  key={student.studentResultId}
                  className={`border transition-all duration-200 shadow-xs ${
                    isExpanded
                      ? 'ring-2 ring-primary/40 border-primary/50 shadow-md bg-card'
                      : 'hover:border-border hover:shadow-xs bg-card'
                  } ${
                    isAllAbsent
                      ? 'bg-destructive/[0.02] border-destructive/25'
                      : isPartialAbsent
                      ? 'bg-amber-500/[0.02] border-amber-500/25'
                      : ''
                  }`}
                >
                  {/* Student Header Card (Click to Expand / Collapse Dropdown) */}
                  <div
                    onClick={() => toggleStudentExpanded(student.studentResultId)}
                    className={`p-3.5 sm:p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none bg-card hover:bg-accent/30 transition-colors ${
                      isExpanded ? 'rounded-t-xl' : 'rounded-xl'
                    }`}
                  >
                    {/* Left: Student Identity */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                          isAllAbsent
                            ? 'bg-destructive/15 text-destructive border border-destructive/25'
                            : isPartialAbsent
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                            : complete
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                            : 'bg-muted text-muted-foreground border'
                        }`}
                      >
                        {isAllAbsent ? (
                          <span className="text-xs font-black">A</span>
                        ) : complete && !isPartialAbsent ? (
                          <Check className="h-4 w-4 stroke-[2.5]" />
                        ) : (
                          <span className="text-xs font-bold">{student.name.charAt(0).toUpperCase()}</span>
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

                          {/* Dynamic Auto-Computed Status Badge */}
                          {isAllAbsent ? (
                            <Badge variant="destructive" className="text-[10px] font-bold h-5 px-1.5 uppercase">
                              All Absent
                            </Badge>
                          ) : isPartialAbsent ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-bold h-5 px-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                            >
                              {absentCount} {absentCount === 1 ? 'Subject' : 'Subjects'} Absent
                            </Badge>
                          ) : complete ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 border border-emerald-500/20">
                              ✓ Completed
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Class: <strong className="text-foreground font-semibold">{student.class || '—'}</strong></span>
                          <span>•</span>
                          <span className="truncate max-w-[180px]">{student.school || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Scores & Expand Dropdown Trigger */}
                    <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                      {/* Score Preview Pill */}
                      <div className="flex items-center gap-2">
                        {isAllAbsent ? (
                          <div className="text-right">
                            <span className="font-mono font-bold text-xs sm:text-sm text-destructive uppercase">
                              Absent
                            </span>
                            <div className="text-[10px] text-muted-foreground">All subjects</div>
                          </div>
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
                    <div className="p-4 sm:p-5 border-t bg-muted/15 space-y-4 rounded-b-xl animate-in fade-in duration-150">
                      {/* Sub-header inside student card: Quick Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Quick Batch Buttons for this student */}
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => markAllSubjectsForStudent(originalIndex, false)}
                            className="h-7 text-[11px] px-2 bg-background hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 font-medium cursor-pointer"
                            title="Mark all subjects as Present for this student"
                          >
                            <UserCheck className="h-3 w-3 mr-1 text-emerald-600" />
                            Mark All Present
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => markAllSubjectsForStudent(originalIndex, true)}
                            className="h-7 text-[11px] px-2 bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 font-medium cursor-pointer"
                            title="Mark all subjects as Absent for this student"
                          >
                            <UserX className="h-3 w-3 mr-1 text-destructive" />
                            Mark All Absent
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => clearAllMarksForStudent(originalIndex)}
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                            title="Clear all entered marks for this student"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        </div>

                        {/* Helper to copy max marks to other students */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyMaxMarksToAll(student)}
                          className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 cursor-pointer font-medium"
                          title="Apply this student's maximum marks pattern to all students in this group"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Apply Max Marks to all
                        </Button>
                      </div>

                      {/* Subject Marks Entry Grid (5 columns on desktop, 6 on 2xl/wide screens so all 5 subjects fit in 1 line) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3">
                        {student.marks.map((mark, markIdx) => {
                          const isExceeded =
                            !mark.isAbsent &&
                            mark.obtainedMarks !== null &&
                            mark.obtainedMarks > mark.maxMarks;
                          const isFilled = mark.obtainedMarks !== null && !mark.isAbsent;

                          return (
                            <div
                              key={mark.markId}
                              className={`relative focus-within:z-40 p-2.5 sm:p-3 rounded-lg border transition-all ${
                                mark.isAbsent
                                  ? 'border-destructive/30 bg-destructive/[0.03]'
                                  : isExceeded
                                  ? 'border-destructive bg-destructive/5'
                                  : isFilled
                                  ? 'border-emerald-500/30 bg-card shadow-xs'
                                  : 'border-border bg-card'
                              }`}
                            >
                              {/* Subject Name */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-xs sm:text-sm text-foreground truncate block">
                                  {mark.subjectName}
                                </span>
                              </div>

                              {/* Inputs Row: [ MarksDropdownInput ] / [ Max Marks ] */}
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 min-w-0">
                                  <MarksDropdownInput
                                    obtainedMarks={mark.obtainedMarks}
                                    isAbsent={mark.isAbsent}
                                    maxMarks={mark.maxMarks}
                                    onChange={(obt, abs) =>
                                      updateSubjectValue(originalIndex, markIdx, obt, abs)
                                    }
                                  />
                                </div>

                                <span className="text-muted-foreground font-bold text-xs">/</span>

                                {/* Manual Maximum Marks Input */}
                                <div className="w-14 shrink-0">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={mark.maxMarks}
                                    onChange={(e) =>
                                      updateStudentMaxMark(originalIndex, markIdx, e.target.value)
                                    }
                                    className="h-8 sm:h-9 font-mono text-xs text-center bg-muted/30 font-semibold px-0.5"
                                    title="Maximum marks"
                                  />
                                </div>
                              </div>

                              {isExceeded && (
                                <p className="text-[10px] text-destructive font-semibold mt-1">
                                  Exceeds max ({mark.maxMarks})
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Dropdown Footer: Live Calculated Results & Done/Next Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
                        {/* Live Total & Percentage Summary */}
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-muted-foreground">Total Obtained: </span>
                            <strong className="text-sm font-bold text-foreground">
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
                                  : (student.percentage || 0) < 40 && student.percentage !== null
                                  ? 'text-destructive'
                                  : 'text-foreground'
                              }`}
                            >
                              {student.percentage !== null
                                ? `${student.percentage.toFixed(2)}%`
                                : isAllAbsent
                                ? 'Absent'
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
                            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-9 px-4 cursor-pointer"
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
                  <th className="p-3 font-semibold text-muted-foreground sticky left-0 z-30 bg-muted/95 min-w-[55px] sm:min-w-[60px] text-center border-r">
                    ID
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground sticky left-[55px] sm:left-[60px] z-30 bg-muted/95 min-w-[150px] sm:min-w-[200px] border-r">
                    Student Name
                  </th>

                  {/* Subject Columns (Generous width for Grammar, Creative, Passage, Vocabulary, Literature, etc.) */}
                  {subjects.map((sub) => (
                    <th
                      key={sub.subjectId}
                      className="p-3 font-semibold text-muted-foreground min-w-[180px] sm:min-w-[200px] text-center border-r"
                    >
                      <div className="font-bold text-foreground text-sm tracking-tight">{sub.subjectName}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        Max: {sub.defaultMax}
                      </div>
                    </th>
                  ))}

                  <th className="p-3 font-semibold text-muted-foreground min-w-[95px] text-center border-r bg-muted/60">
                    Total
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground min-w-[95px] text-center border-r bg-muted/60">
                    %
                  </th>
                  <th className="p-3 font-semibold text-muted-foreground min-w-[75px] text-center bg-muted/60">
                    Rank
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4 + subjects.length}
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
                    const absentCount = student.marks.filter((m) => m.isAbsent).length;
                    const isAllAbsent = student.marks.length > 0 && absentCount === student.marks.length;

                    return (
                      <tr
                        key={student.studentResultId}
                        className={`hover:bg-accent/40 transition-colors ${
                          isAllAbsent ? 'bg-destructive/5 text-muted-foreground' : ''
                        }`}
                      >
                        {/* Student ID (Sticky) */}
                        <td className="p-2.5 font-mono text-xs font-semibold sticky left-0 z-10 bg-background/95 border-r text-center">
                          {student.studentId}
                        </td>

                        {/* Student Name (Sticky) */}
                        <td className="p-2.5 font-medium sticky left-[55px] sm:left-[60px] z-10 bg-background/95 border-r truncate max-w-[200px]">
                          <div className="truncate font-semibold text-foreground">{student.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Class: {student.class || '—'}
                          </div>
                        </td>

                        {/* Subject Mark Inputs with direct unified dropdown component */}
                        {student.marks.map((mark, markIdx) => {
                          return (
                            <td key={mark.markId} className="p-2.5 border-r text-center">
                              <div className="flex items-center justify-center gap-1.5 max-w-[180px] mx-auto">
                                <MarksDropdownInput
                                  obtainedMarks={mark.obtainedMarks}
                                  isAbsent={mark.isAbsent}
                                  maxMarks={mark.maxMarks}
                                  isTable={true}
                                  onChange={(obt, abs) =>
                                    updateSubjectValue(originalIndex, markIdx, obt, abs)
                                  }
                                  className="w-24 sm:w-28"
                                />

                                <span className="text-muted-foreground text-xs font-bold">/</span>
                                <Input
                                  type="number"
                                  min={1}
                                  max={500}
                                  value={mark.maxMarks}
                                  onChange={(e) =>
                                    updateStudentMaxMark(originalIndex, markIdx, e.target.value)
                                  }
                                  className="h-8 w-14 text-center font-mono text-xs px-1 bg-muted/40 font-semibold"
                                  title="Maximum marks for this student"
                                />
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Obtained */}
                        <td className="p-2.5 text-center font-mono font-bold border-r bg-muted/20">
                          {isAllAbsent ? (
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
                          {isAllAbsent ? (
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
                          {isAllAbsent ? (
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
