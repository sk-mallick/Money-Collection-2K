import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchStudentReport, type StudentReportResult } from '@/lib/reports-api';
import { fetchStudents, fetchGroups } from '@/lib/api';
import type { Student, Group } from '@/lib/constants';
import { MONTH_NAMES } from '@/lib/constants';
import logoUrl from '@/assets/favicon.png';
import {
  UserRound,
  Search,
  Printer,
  Calendar,
  Send,
  Phone,
  FileText,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Award,
  TrendingUp,
  Pencil,
  School,
  Users,
  BookOpen,
  X,
  Filter,
  RotateCcw,
} from 'lucide-react';

// Academic session month sequence (April to March)
const SESSION_MONTHS = [
  'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'
] as const;

export default function StudentReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Directory Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Detail View Active Tab
  const [activeTab, setActiveTab] = useState<'card' | 'history'>('card');
  
  const [reportData, setReportData] = useState<{
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
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load students & groups on mount
  useEffect(() => {
    async function load() {
      try {
        const [students, groupsList] = await Promise.all([fetchStudents(), fetchGroups()]);
        setStudentsList(students);
        setGroups(groupsList);

        const urlStudentId = searchParams.get('studentId');
        if (urlStudentId) {
          setSelectedStudentId(urlStudentId);
        }
      } catch (err) {
        console.error('Failed to load students:', err);
        toast.error('Failed to load students');
      } finally {
        setInitialLoading(false);
      }
    }
    load();
  }, [searchParams]);

  // Load report data when a student is selected
  const loadReport = useCallback(async (sId: string) => {
    if (!sId) {
      setReportData(null);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchStudentReport(sId);
      setReportData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load student report';
      toast.error(msg);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadReport(selectedStudentId);
    } else {
      setReportData(null);
    }
  }, [selectedStudentId, loadReport]);

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setSearchParams({ studentId: id });
  };

  const handleBackToList = () => {
    setSelectedStudentId('');
    setSearchParams({});
  };

  // Filter student list for directory
  const filteredStudents = useMemo(() => {
    return studentsList.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        (s.school && s.school.toLowerCase().includes(query)) ||
        (s.class && s.class.toLowerCase().includes(query));

      const matchesGroup = filterGroup === 'all' || s.group === filterGroup;
      const matchesClass = filterClass === 'all' || s.class === filterClass;
      const matchesCategory = filterCategory === 'all' || s.category === filterCategory;

      return matchesSearch && matchesGroup && matchesClass && matchesCategory;
    });
  }, [studentsList, searchQuery, filterGroup, filterClass, filterCategory]);

  // Dependent Available Groups based on Category & Class filters
  const availableGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchCategory = filterCategory === 'all' || g.category === filterCategory;
      const matchClass =
        filterClass === 'all' ||
        (g.class && g.class.toLowerCase().includes(filterClass.toLowerCase())) ||
        studentsList.some((s) => s.group === g.id && s.class === filterClass);
      return matchCategory && matchClass;
    });
  }, [groups, filterCategory, filterClass, studentsList]);

  // Dependent Available Classes based on Category & Group filters
  const availableClasses = useMemo(() => {
    const matchingStudents = studentsList.filter((s) => {
      const matchCategory = filterCategory === 'all' || s.category === filterCategory;
      const matchGroup = filterGroup === 'all' || s.group === filterGroup;
      return matchCategory && matchGroup;
    });

    const classesSet = new Set(matchingStudents.map((s) => s.class).filter(Boolean));

    // Also include classes defined on selected group
    if (filterGroup !== 'all') {
      const grp = groups.find((g) => g.id === filterGroup);
      if (grp && grp.class) {
        grp.class.split('&').forEach((c) => {
          const clean = c.trim();
          if (clean) classesSet.add(clean);
        });
      }
    }

    return Array.from(classesSet).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [studentsList, groups, filterCategory, filterGroup]);

  // Category change handler with cascading auto-reset
  const handleCategoryChange = (val: string) => {
    setFilterCategory(val);
    if (val !== 'all') {
      if (filterGroup !== 'all') {
        const grp = groups.find((g) => g.id === filterGroup);
        if (grp && grp.category !== val) {
          setFilterGroup('all');
        }
      }
      if (filterClass !== 'all') {
        const classBelongs = studentsList.some(
          (s) => s.class === filterClass && s.category === val
        );
        if (!classBelongs) {
          setFilterClass('all');
        }
      }
    }
  };

  // Group change handler with auto-sync category and cascading class filter
  const handleGroupChange = (val: string) => {
    setFilterGroup(val);
    if (val !== 'all') {
      const grp = groups.find((g) => g.id === val);
      if (grp) {
        setFilterCategory(grp.category);
      }
      if (filterClass !== 'all') {
        const hasClass = studentsList.some((s) => s.group === val && s.class === filterClass);
        if (!hasClass) {
          setFilterClass('all');
        }
      }
    }
  };

  // Class change handler with auto-sync category and cascading group filter
  const handleClassChange = (val: string) => {
    setFilterClass(val);
    if (val !== 'all') {
      const matching = studentsList.filter((s) => s.class === val);
      if (matching.length > 0) {
        const categories = Array.from(new Set(matching.map((s) => s.category)));
        if (categories.length === 1 && filterCategory !== categories[0]) {
          setFilterCategory(categories[0]);
        }
      }
      if (filterGroup !== 'all') {
        const hasClassInGroup = studentsList.some(
          (s) => s.group === filterGroup && s.class === val
        );
        if (!hasClassInGroup) {
          setFilterGroup('all');
        }
      }
    }
  };

  // Check if any filters are actively applied
  const hasActiveFilters = Boolean(
    searchQuery.trim() !== '' ||
    filterGroup !== 'all' ||
    filterClass !== 'all' ||
    filterCategory !== 'all'
  );

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setFilterGroup('all');
    setFilterClass('all');
    setFilterCategory('all');
  };

  // Format date helper: e.g. 1-Mar-2026
  const formatReportDate = (dStr?: string | null) => {
    if (!dStr) return 'NIL';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      const day = d.getDate();
      const monthShort = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day}-${monthShort}-${year}`;
    } catch {
      return dStr || 'NIL';
    }
  };

  // Determine subjects columns: Junior vs Senior
  const isJunior = reportData?.student.category === 'Junior';
  const subjectsList = useMemo(() => {
    if (isJunior) {
      return ['Olympiad', 'Grammar', 'Creative', 'Passage', 'Vocabulary'];
    }
    return ['Literature', 'Grammar', 'Creative', 'Passage', 'Vocabulary'];
  }, [isJunior]);

  // Map result rows by month code
  const resultsByMonth = useMemo(() => {
    const map = new Map<string, StudentReportResult>();
    if (reportData && reportData.results) {
      reportData.results.forEach((r) => {
        map.set(r.month.toUpperCase(), r);
      });
    }
    return map;
  }, [reportData]);

  // Academic year from settings or latest result
  const academicSession = reportData?.settings?.academicYear || '2026-27';

  // Navigation between students (previous / next)
  const currentStudentIndex = useMemo(() => {
    return filteredStudents.findIndex((s) => s.id === selectedStudentId);
  }, [filteredStudents, selectedStudentId]);

  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      handleSelectStudent(filteredStudents[currentStudentIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex >= 0 && currentStudentIndex < filteredStudents.length - 1) {
      handleSelectStudent(filteredStudents[currentStudentIndex + 1].id);
    }
  };

  // Academic statistics for the selected student
  const stats = useMemo(() => {
    if (!reportData || !reportData.results || reportData.results.length === 0) {
      return { totalExams: 0, avgPercentage: 0, highestPercentage: 0, bestMonth: '—' };
    }
    const attended = reportData.results.filter(
      (r) => r.status !== 'Absent' && r.percentage !== null && r.percentage !== undefined
    );
    if (attended.length === 0) {
      return { totalExams: reportData.results.length, avgPercentage: 0, highestPercentage: 0, bestMonth: '—' };
    }

    const validScores = attended
      .map((r) => ({
        month: r.month,
        percentage: Number(r.percentage),
      }))
      .filter((s) => !isNaN(s.percentage));

    if (validScores.length === 0) {
      return { totalExams: reportData.results.length, avgPercentage: 0, highestPercentage: 0, bestMonth: '—' };
    }

    const sum = validScores.reduce((acc, curr) => acc + curr.percentage, 0);
    const avg = Math.round(sum / validScores.length);
    const highest = Math.max(...validScores.map((s) => s.percentage));
    const bestResult = validScores.find((s) => Math.abs(s.percentage - highest) < 0.01);

    return {
      totalExams: reportData.results.length,
      avgPercentage: isNaN(avg) ? 0 : avg,
      highestPercentage: isNaN(highest) ? 0 : Math.round(highest),
      bestMonth: bestResult ? (MONTH_NAMES[bestResult.month] || bestResult.month) : '—',
    };
  }, [reportData]);

  // Helper to format marks cleanly without unnecessary decimals (.00)
  const formatMark = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString();
  };

  // Helper to determine Grade from percentage
  const getGrade = (percentage: number | null) => {
    if (percentage === null || percentage === undefined) return '—';
    const num = Number(percentage);
    if (isNaN(num)) return '—';
    if (num >= 90) return 'A+';
    if (num >= 80) return 'A';
    if (num >= 70) return 'B+';
    if (num >= 60) return 'B';
    if (num >= 50) return 'C';
    if (num >= 40) return 'D';
    return 'E';
  };

  // If a student is selected -> Show Detail View ("Inside")
  if (selectedStudentId) {
    return (
      <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 w-full">
        {/* ─── TOP HEADER & ACTION BAR ─── */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToList}
              className="h-8.5 px-3 gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Students</span>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                  {reportData?.student.name || 'Student Report'}
                </h1>
                {reportData && (
                  <>
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border">
                      {reportData.student.id}
                    </span>
                    <Badge
                      className={`text-[10px] px-2 py-0.5 font-bold rounded-full border-0 text-white ${
                        reportData.student.category === 'Junior'
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-red-600 dark:bg-red-500'
                      }`}
                    >
                      {reportData.student.category}
                    </Badge>
                    {reportData.student.class && (
                      <Badge variant="outline" className="text-[10px]">
                        Class {reportData.student.class}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">
                Academic progress details and official printable A4 report card
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Previous / Next Student Navigator */}
            <div className="flex items-center border rounded-lg overflow-hidden bg-background shadow-2xs">
              <Button
                variant="ghost"
                size="sm"
                className="h-8.5 px-2.5 rounded-none cursor-pointer"
                onClick={handlePrevStudent}
                disabled={currentStudentIndex <= 0}
                title="Previous Student"
              >
                <ChevronLeft className="h-4 w-4 mr-0.5" />
                <span className="text-xs hidden md:inline">Prev</span>
              </Button>
              <span className="text-[11px] font-semibold text-muted-foreground px-2 border-x">
                {currentStudentIndex >= 0 ? `${currentStudentIndex + 1} / ${filteredStudents.length}` : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8.5 px-2.5 rounded-none cursor-pointer"
                onClick={handleNextStudent}
                disabled={currentStudentIndex >= filteredStudents.length - 1 || currentStudentIndex === -1}
                title="Next Student"
              >
                <span className="text-xs hidden md:inline">Next</span>
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </Button>
            </div>

            {/* Print / Download Button */}
            <Button
              onClick={() => window.print()}
              disabled={!reportData}
              className="h-8.5 gap-1.5 px-3.5 bg-primary text-primary-foreground font-semibold shadow-xs cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Download PDF</span>
            </Button>
          </div>
        </div>

        {/* ─── LOADING STATE ─── */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div className="lg:col-span-8">
              <Skeleton className="h-[600px] w-full rounded-xl" />
            </div>
          </div>
        ) : !reportData ? (
          <Card className="p-12 text-center text-muted-foreground">
            <UserRound className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold mb-1">Student Not Found</h3>
            <p className="text-xs text-muted-foreground mb-4">The selected student could not be loaded.</p>
            <Button variant="outline" size="sm" onClick={handleBackToList}>
              Back to Students List
            </Button>
          </Card>
        ) : (
          /* ─── MAIN TWO-COLUMN SPLIT LAYOUT ─── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start w-full">
            {/* ══════════════════════════════════════════════════════
                LEFT SIDE (Desktop): STUDENT PROFILE & PERFORMANCE DETAILS
                ══════════════════════════════════════════════════════ */}
            <div className="no-print lg:col-span-4 xl:col-span-4 space-y-4 w-full">
              {/* Profile Card */}
              <Card className="bg-card/70 backdrop-blur-xs border shadow-xs overflow-hidden">
                <CardContent className="p-4 space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-13 w-13 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 text-white shadow-xs ${
                        reportData.student.category === 'Junior'
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700'
                          : 'bg-gradient-to-br from-red-600 to-rose-700'
                      }`}
                    >
                      {reportData.student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm sm:text-base leading-tight truncate">
                          {reportData.student.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border">
                          {reportData.student.id}
                        </span>
                        <Badge
                          className={`text-[10px] px-2 py-0.2 font-bold rounded-full border-0 text-white ${
                            reportData.student.category === 'Junior'
                              ? 'bg-blue-600 dark:bg-blue-500'
                              : 'bg-red-600 dark:bg-red-500'
                          }`}
                        >
                          {reportData.student.category}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* 2x2 Performance KPIs */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mb-0.5">
                        <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                        <span>Exams Taken</span>
                      </div>
                      <div className="text-base font-bold">{stats.totalExams}</div>
                      <div className="text-[10px] text-muted-foreground">Recorded months</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mb-0.5">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Average Score</span>
                      </div>
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {stats.avgPercentage}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">Grade: {getGrade(stats.avgPercentage)}</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mb-0.5">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        <span>Best Score</span>
                      </div>
                      <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                        {stats.highestPercentage}%
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{stats.bestMonth}</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mb-0.5">
                        <Users className="h-3.5 w-3.5 text-purple-500" />
                        <span>Tuition Batch</span>
                      </div>
                      <div className="text-base font-bold truncate">
                        Group {reportData.student.group_id || '—'}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {reportData.student.class ? `Class ${reportData.student.class}` : 'No Class'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Academic & Personal Information Card */}
              <Card className="bg-card/70 backdrop-blur-xs border shadow-xs">
                <CardHeader className="p-3.5 pb-2 border-b border-border/50">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    <span>Academic & Student Info</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-medium">Class / Standard</span>
                    <span className="font-bold text-foreground">{reportData.student.class || 'NIL'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-medium">School</span>
                    <span className="font-semibold text-foreground text-right max-w-[180px] truncate" title={reportData.student.school || ''}>
                      {reportData.student.school || 'NIL'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-medium">Tuition Group</span>
                    <span className="font-bold text-foreground">Group {reportData.student.group_id || 'NIL'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-medium">Admission Date</span>
                    <span className="font-mono text-foreground">{formatReportDate(reportData.student.adm_date)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground font-medium">Date of Birth</span>
                    <span className="font-mono text-foreground">{formatReportDate(reportData.student.dob)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information Card */}
              <Card className="bg-card/70 backdrop-blur-xs border shadow-xs">
                <CardHeader className="p-3.5 pb-2 border-b border-border/50">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>Contact Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-medium">Father's Contact</span>
                    {reportData.student.father_no ? (
                      <a
                        href={`tel:${reportData.student.father_no}`}
                        className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{reportData.student.father_no}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground font-mono">NIL</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-medium">Mother's Contact</span>
                    {reportData.student.mother_no ? (
                      <a
                        href={`tel:${reportData.student.mother_no}`}
                        className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{reportData.student.mother_no}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground font-mono">NIL</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground font-medium">Personal Contact</span>
                    {reportData.student.contact_no ? (
                      <a
                        href={`tel:${reportData.student.contact_no}`}
                        className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{reportData.student.contact_no}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground font-mono">NIL</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Results History Drilldown */}
              {reportData.results && reportData.results.length > 0 && (
                <Card className="bg-card/70 backdrop-blur-xs border shadow-xs">
                  <CardHeader className="p-3.5 pb-2 border-b border-border/50">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>Monthly Exam Records ({reportData.results.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto">
                    {reportData.results.map((res) => {
                      const isAbsent = res.status === 'Absent';
                      const monthName = MONTH_NAMES[res.month] || res.month;
                      return (
                        <div
                          key={res.id}
                          className="p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="font-bold text-foreground">
                              {monthName} {res.academic_year}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {isAbsent ? (
                                <span className="text-destructive font-semibold">Absent</span>
                              ) : (
                                <>
                                  Score: <strong className="text-foreground font-mono">{formatMark(res.total_obtained)}/{formatMark(res.total_max)}</strong>
                                  {' · '}
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{Math.round(Number(res.percentage) || 0)}%</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {res.class_rank && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold bg-amber-500/10 text-amber-600 border-amber-500/20">
                                Rank #{res.class_rank}
                              </Badge>
                            )}
                            <Button
                              size="xs"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10 cursor-pointer"
                              onClick={() => navigate(`/reports/monthly/${res.result_period_id}/marks`)}
                              title="Edit Marks"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              <span>Edit</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════
                RIGHT SIDE (Desktop) / BELOW (Mobile): AUTHENTIC A4 REPORT CARD
                ══════════════════════════════════════════════════════ */}
            <div className="lg:col-span-8 xl:col-span-8 w-full">
              <div className="printable-report w-full bg-white text-black font-sans border-[2.5px] border-black rounded-lg p-3 sm:p-5 lg:p-6 shadow-sm space-y-3 sm:space-y-4">
                {/* ─── 1. Header Block with Logo & Official Branding ─── */}
                <div className="flex items-center gap-3 sm:gap-4 pb-1">
                  {/* Logo */}
                  <div className="shrink-0 flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="EnglishJibi"
                      className="h-14 w-14 sm:h-18 sm:w-18 object-contain rounded-full border border-gray-300 shadow-2xs"
                    />
                  </div>

                  {/* Institution Details */}
                  <div className="flex-1 text-center pr-2 sm:pr-4">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight uppercase font-sans">
                      <span className="text-black">ENGLISH</span>
                      <span className="text-red-600">JIBI</span>{' '}
                      <span className="text-black">CLASSES</span>
                    </h1>
                    <p className="text-[11px] sm:text-xs italic font-semibold text-gray-800 tracking-wide mt-0.5">
                      Your Child, Our Responsibility
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-gray-700 font-medium mt-0.5 leading-tight">
                      {reportData.settings.address || 'Duplex - 37, In front of DAV School, Sailashree Vihar, BBSR.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-[9px] sm:text-[10.5px] font-semibold text-sky-700 pt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Send className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-sky-500 fill-sky-500" />
                        {reportData.settings.instagram || '@englishwithchiranjibisir'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sky-800">
                        <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-sky-600" />
                        {reportData.settings.phone1 || '+91 83289 22917'} / {reportData.settings.phone2 || '+91 7735812335'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ─── 2. Red Separator Line ─── */}
                <div className="h-1 bg-red-600 w-full" />

                {/* ─── 3. Academic Session & Sub-Title ─── */}
                <div className="text-center py-0.5 space-y-0.5">
                  <h2 className="text-[11px] sm:text-xs font-black uppercase text-amber-700 tracking-wider">
                    ACADEMIC SESSION: {academicSession}
                  </h2>
                  <div className="text-[10px] sm:text-[11px] font-bold text-gray-800">
                    Official Annual Report Card
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-black underline underline-offset-2 pt-0.5">
                    Student's Profile
                  </div>
                </div>

                {/* ─── 4. Student Profile Info Grid (2-Column Aligned with Colons) ─── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1 text-[10.5px] sm:text-xs font-semibold py-1 px-1 border-b border-gray-300 pb-2">
                  {/* Left Column */}
                  <div className="space-y-0.5">
                    <div className="flex">
                      <span className="w-28 sm:w-32 text-gray-800 uppercase font-bold text-[10px] sm:text-[11px]">STUDENT ID</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono font-bold text-black">{reportData.student.id}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 sm:w-32 text-gray-800 uppercase font-bold text-[10px] sm:text-[11px]">STUDENT NAME</span>
                      <span className="mr-1">:</span>
                      <span className="font-bold text-black">{reportData.student.name}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 sm:w-32 text-gray-800 uppercase font-bold text-[10px] sm:text-[11px]">FATHER'S CONTACT</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono text-gray-900">{reportData.student.father_no || 'NIL'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 sm:w-32 text-gray-800 uppercase font-bold text-[10px] sm:text-[11px]">MOTHER'S CONTACT</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono text-gray-900">{reportData.student.mother_no || 'NIL'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 sm:w-32 text-gray-800 uppercase font-bold text-[10px] sm:text-[11px]">PERSONAL CONTACT</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono text-gray-900">{reportData.student.contact_no || 'NIL'}</span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-0.5">
                    <div className="flex">
                      <span className="w-28 sm:w-32 text-gray-800 uppercase font-bold text-[10px] sm:text-[11px]">CLASS</span>
                      <span className="mr-1">:</span>
                      <span className="font-bold text-black">{reportData.student.class || 'NIL'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 sm:w-32 text-gray-800 uppercase font-bold text-[10px] sm:text-[11px]">SCHOOL</span>
                      <span className="mr-1">:</span>
                      <span className="font-bold text-black truncate" title={reportData.student.school || ''}>
                        {reportData.student.school || 'NIL'}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-28 sm:w-32 text-gray-800 uppercase font-bold text-[10px] sm:text-[11px]">ADMISSION DATE</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono text-gray-900">{formatReportDate(reportData.student.adm_date)}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 sm:w-32 text-gray-800 uppercase font-bold text-[10px] sm:text-[11px]">DATE OF BIRTH</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono text-gray-900">{formatReportDate(reportData.student.dob)}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 sm:w-32 text-gray-800 uppercase font-bold text-[10px] sm:text-[11px]">TUITION GROUP</span>
                      <span className="mr-1">:</span>
                      <span className="font-bold text-black">Group {reportData.student.group_id || 'NIL'}</span>
                    </div>
                  </div>
                </div>

                {/* ─── 5. Section Heading: RESULT SUMMARY ─── */}
                <div className="text-center pt-0.5">
                  <h3 className="text-[11px] sm:text-xs font-black uppercase text-amber-700 tracking-wider underline underline-offset-2">
                    RESULT SUMMARY
                  </h3>
                </div>

                {/* ─── 6. Performance Matrix Table (All 12 Months) ─── */}
                {/* Fits all screen sizes cleanly without horizontal scrolling */}
                <div className="w-full">
                  <table className="w-full text-center border-collapse border-[1.5px] border-black text-[9px] sm:text-[11px] leading-tight">
                    <thead className="bg-gray-100 font-bold border-b-[1.5px] border-black text-black">
                      <tr>
                        <th className="p-1 sm:p-1.5 border border-black font-black uppercase text-left pl-1.5 sm:pl-2 w-[16%]">
                          MONTH
                        </th>
                        {subjectsList.map((subName) => (
                          <th key={subName} className="p-0.5 sm:p-1.5 border border-black font-bold uppercase w-[12%]">
                            {subName}
                          </th>
                        ))}
                        <th className="p-0.5 sm:p-1.5 border border-black font-bold uppercase w-[14%]">
                          Total
                        </th>
                        <th className="p-0.5 sm:p-1.5 border border-black font-bold uppercase w-[10%]">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-medium">
                      {SESSION_MONTHS.map((mCode) => {
                        const monthName = MONTH_NAMES[mCode]?.toUpperCase() || mCode;
                        const monthResult = resultsByMonth.get(mCode);
                        const isAbsent = monthResult?.status === 'Absent';

                        // Build marks map for this month
                        const marksMap = new Map<string, { obt: number | null; max: number; isAbsent?: boolean }>();
                        if (monthResult && monthResult.marks) {
                          monthResult.marks.forEach((mk) => {
                            marksMap.set(mk.subject_name.toLowerCase(), {
                              obt: mk.obtained_marks,
                              max: mk.max_marks,
                              isAbsent: Boolean(mk.is_absent),
                            });
                          });
                        }

                        return (
                          <tr key={mCode} className="h-6 sm:h-6.5 hover:bg-gray-50/50">
                            {/* Month Column */}
                            <td className="p-0.5 sm:p-1 border border-black font-bold uppercase text-left pl-1.5 sm:pl-2 text-black">
                              {monthName}
                            </td>

                            {/* Subject Marks Columns */}
                            {subjectsList.map((subName) => {
                              const mk = marksMap.get(subName.toLowerCase());

                              if (!monthResult) {
                                return <td key={subName} className="p-0.5 border border-black" />;
                              }

                              if (isAbsent || mk?.isAbsent) {
                                return (
                                  <td key={subName} className="p-0.5 border border-black font-bold text-red-600">
                                    A
                                  </td>
                                );
                              }

                              if (!mk || mk.obt === null) {
                                return <td key={subName} className="p-0.5 border border-black" />;
                              }

                              return (
                                <td key={subName} className="p-0.5 border border-black font-mono font-semibold text-black">
                                  {formatMark(mk.obt)}/{formatMark(mk.max)}
                                </td>
                              );
                            })}

                            {/* Total Column */}
                            <td className="p-0.5 border border-black font-mono font-bold text-black">
                              {monthResult
                                ? isAbsent
                                  ? 'A'
                                  : monthResult.total_obtained !== null
                                  ? `${formatMark(monthResult.total_obtained)}/${formatMark(monthResult.total_max)}`
                                  : ''
                                : ''}
                            </td>

                            {/* Percentage Column */}
                            <td className="p-0.5 border border-black font-mono font-bold text-black">
                              {monthResult
                                ? isAbsent
                                  ? '-'
                                  : monthResult.percentage !== null
                                  ? `${Math.round(Number(monthResult.percentage))}%`
                                  : ''
                                : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ─── 7. Cumulative Evaluation Summary Box ─── */}
                <div className="grid grid-cols-3 border-[1.5px] border-black bg-gray-50 text-[10px] sm:text-xs font-bold text-center">
                  <div className="p-1.5 sm:p-2 border-r border-black">
                    <span className="text-gray-600 block text-[9px] sm:text-[10px] uppercase font-semibold">Exams Attended</span>
                    <span className="font-bold text-black">{stats.totalExams} of 12 Months</span>
                  </div>
                  <div className="p-1.5 sm:p-2 border-r border-black">
                    <span className="text-gray-600 block text-[9px] sm:text-[10px] uppercase font-semibold">Cumulative Avg</span>
                    <span className="font-bold text-black">{stats.avgPercentage}%</span>
                  </div>
                  <div className="p-1.5 sm:p-2">
                    <span className="text-gray-600 block text-[9px] sm:text-[10px] uppercase font-semibold">Overall Grade</span>
                    <span className="font-black text-red-600">{getGrade(stats.avgPercentage)}</span>
                  </div>
                </div>

                {/* ─── 8. Feedback Box ─── */}
                <div className="border-[1.5px] border-black rounded-xs overflow-hidden">
                  <div className="border-b-[1.5px] border-black bg-gray-50 px-2.5 py-0.5 font-bold text-[10px] sm:text-xs uppercase w-28 border-r">
                    FEEDBACK
                  </div>
                  <div className="h-12 sm:h-14 p-1.5 text-[10px] sm:text-xs text-gray-700 italic flex items-center">
                    {stats.avgPercentage >= 80 ? (
                      <span>Outstanding academic performance and consistent dedication throughout the academic year.</span>
                    ) : stats.avgPercentage >= 60 ? (
                      <span>Good progress shown with steady potential. Focus on consistent practice and revisions.</span>
                    ) : stats.totalExams > 0 ? (
                      <span>Needs regular improvement in core foundation areas. Extra guidance is encouraged.</span>
                    ) : (
                      <span className="text-gray-400">Official teacher's assessment will be provided upon examination completion.</span>
                    )}
                  </div>
                </div>

                {/* ─── 9. Teacher and Parent Signature Block ─── */}
                <div className="pt-4 sm:pt-6 pb-1 grid grid-cols-2 gap-6 text-[10.5px] sm:text-xs font-bold text-black">
                  <div className="space-y-0.5">
                    <div className="text-[10px] sm:text-[11px] font-mono font-bold text-black">
                      * {reportData.settings.teacherName || reportData.settings.adminName || 'CHIRANJIBI SIR'}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-sans font-semibold text-gray-800 border-t border-black/40 pt-0.5 inline-block pr-6">
                      Teacher's Signature
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <div className="text-[10px] sm:text-[11px] font-mono font-bold text-black">
                      {formatReportDate(new Date().toISOString())}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-sans font-semibold text-gray-800 border-t border-black/40 pt-0.5 inline-block pl-6">
                      Parent's Signature & Date
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── DIRECTORY VIEW: LIST OF ALL EXISTING STUDENTS ───
  return (
    <div className="page-enter p-4 sm:p-6 space-y-6 w-full">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Student Reports & Results</h1>
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 rounded-full font-bold">
              {studentsList.length} Students
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Browse all existing students to view comprehensive monthly marks history and generate official report cards
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">Total Students</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold">{studentsList.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Enrolled candidates</div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <GraduationCap className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground font-medium">Junior Section</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {studentsList.filter(s => s.category === 'Junior').length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Olympiad & Foundation</div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Award className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground font-medium">Senior Section</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
              {studentsList.filter(s => s.category === 'Senior').length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Literature & Advanced</div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <School className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground font-medium">Active Groups</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold">{groups.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Classroom batches</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar & Active Filters */}
      <div className="space-y-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3 justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, ID, school, class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs sm:text-sm h-9 bg-card"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Group Filter */}
            <Select value={filterGroup} onValueChange={handleGroupChange}>
              <SelectTrigger className="flex-1 sm:flex-initial w-auto sm:w-[135px] text-xs sm:text-sm h-9 bg-card">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {availableGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    Group {g.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Class Filter */}
            <Select value={filterClass} onValueChange={handleClassChange}>
              <SelectTrigger className="flex-1 sm:flex-initial w-auto sm:w-[125px] text-xs sm:text-sm h-9 bg-card">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {availableClasses.map((c) => (
                  <SelectItem key={c} value={c}>
                    Class {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="flex-1 sm:flex-initial w-auto sm:w-[135px] text-xs sm:text-sm h-9 bg-card">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Junior">Junior Section</SelectItem>
                <SelectItem value="Senior">Senior Section</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-muted/20 border text-xs animate-in fade-in duration-200">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Active:</span>
            </span>

            {/* Search chip */}
            {searchQuery.trim() !== '' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-primary/10 text-primary border-primary/20"
              >
                <span>Search: "{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="rounded-full p-0.5 hover:bg-primary/20 cursor-pointer"
                  title="Clear search filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Category chip */}
            {filterCategory !== 'all' && (
              <Badge
                variant="secondary"
                className={`h-6 gap-1 pl-2 pr-1 text-[11px] font-bold ${
                  filterCategory === 'Junior'
                    ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-600/30'
                    : 'bg-red-600/15 text-red-600 dark:text-red-400 border-red-600/30'
                }`}
              >
                <span>Category: {filterCategory}</span>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('all')}
                  className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                  title="Clear category filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Group chip */}
            {filterGroup !== 'all' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              >
                <span>Group {filterGroup}</span>
                <button
                  type="button"
                  onClick={() => handleGroupChange('all')}
                  className="rounded-full p-0.5 hover:bg-blue-500/20 cursor-pointer"
                  title="Clear group filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Class chip */}
            {filterClass !== 'all' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              >
                <span>Class {filterClass}</span>
                <button
                  type="button"
                  onClick={() => handleClassChange('all')}
                  className="rounded-full p-0.5 hover:bg-emerald-500/20 cursor-pointer"
                  title="Clear class filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Clear All Button */}
            <Button
              variant="ghost"
              size="xs"
              onClick={handleClearAllFilters}
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer font-medium"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>Reset All</span>
            </Button>

            <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">
              Showing <strong className="text-foreground font-bold">{filteredStudents.length}</strong> of {studentsList.length} students
            </span>
          </div>
        )}
      </div>

      {/* Student List View */}
      {initialLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-14 sm:h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <UserRound className="h-12 w-12 mx-auto mb-3 opacity-40 text-muted-foreground" />
          <h3 className="text-base font-semibold mb-1">No Students Found</h3>
          <p className="text-xs text-muted-foreground mb-4">
            No students match your search or filter criteria.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAllFilters}
          >
            Clear All Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredStudents.map((student) => {
            const isJuniorCat = student.category === 'Junior';

            return (
              <Card
                key={student.id}
                onClick={() => handleSelectStudent(student.id)}
                className="group overflow-hidden border bg-card/60 backdrop-blur-xs transition-all duration-200 hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs py-0 gap-0 rounded-xl cursor-pointer"
              >
                <CardContent className="p-2.5 sm:p-3 flex items-center justify-between gap-3 px-3 sm:px-3.5">
                  {/* Left Column: ID, Name, Category, Class, School */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <span className="font-mono text-[11px] sm:text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border shrink-0">
                      {student.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* Name & Category Badge */}
                      <div className="flex items-center gap-1.5 sm:gap-2 leading-tight min-w-0">
                        <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {student.name}
                        </span>
                        <Badge
                          className={`text-[9px] px-2 py-0.5 leading-tight font-bold rounded-full border-none shrink-0 text-white transition-colors ${
                            isJuniorCat
                              ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                              : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                          }`}
                        >
                          {student.category}
                        </Badge>
                      </div>

                      {/* School & Class Metadata */}
                      <div className="text-[11px] sm:text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                        <School className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">{student.school || 'No School'}</span>
                        {student.class && (
                          <>
                            <span className="text-muted-foreground/60">•</span>
                            <span className="font-medium text-foreground/80">Class {student.class}</span>
                          </>
                        )}
                        {student.admDate && (
                          <>
                            <span className="text-muted-foreground/60 hidden sm:inline">•</span>
                            <span className="hidden sm:inline">Adm: {formatReportDate(student.admDate)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Group Meta (Desktop) & Chevron Icon */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="hidden md:block text-right">
                      <div className="text-xs font-semibold text-foreground">
                        {student.group ? `Group ${student.group}` : 'Unassigned'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Tuition Batch</div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
