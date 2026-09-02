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
    const attended = reportData.results.filter(r => r.status !== 'Absent' && r.percentage !== null);
    if (attended.length === 0) {
      return { totalExams: reportData.results.length, avgPercentage: 0, highestPercentage: 0, bestMonth: '—' };
    }

    const percentages = attended.map(r => r.percentage || 0);
    const sum = percentages.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / percentages.length);
    const highest = Math.max(...percentages);
    const bestResult = attended.find(r => r.percentage === highest);

    return {
      totalExams: reportData.results.length,
      avgPercentage: avg,
      highestPercentage: Math.round(highest),
      bestMonth: bestResult ? (MONTH_NAMES[bestResult.month] || bestResult.month) : '—',
    };
  }, [reportData]);

  // If a student is selected -> Show Detail View ("Inside")
  if (selectedStudentId) {
    return (
      <div className="page-enter p-4 sm:p-6 space-y-6 w-full">
        {/* ─── TOP HEADER & ACTION BAR ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToList}
              className="gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Students</span>
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {reportData?.student.name || 'Student Report'}
                </h1>
                {reportData && (
                  <>
                    <Badge variant="outline" className="font-mono text-xs">
                      {reportData.student.id}
                    </Badge>
                    <Badge
                      className={`text-xs px-2 py-0.5 font-bold rounded-full border-0 text-white ${
                        reportData.student.category === 'Junior'
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-red-600 dark:bg-red-500'
                      }`}
                    >
                      {reportData.student.category}
                    </Badge>
                    {reportData.student.class && (
                      <Badge variant="outline" className="text-xs">
                        Class {reportData.student.class}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comprehensive marks history and official report card
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Previous / Next Student Navigator */}
            <div className="hidden md:flex items-center border rounded-lg overflow-hidden bg-background shadow-2xs">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 rounded-none"
                onClick={handlePrevStudent}
                disabled={currentStudentIndex <= 0}
                title="Previous Student"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[11px] font-medium text-muted-foreground px-2">
                {currentStudentIndex >= 0 ? `${currentStudentIndex + 1} of ${filteredStudents.length}` : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 rounded-none"
                onClick={handleNextStudent}
                disabled={currentStudentIndex >= filteredStudents.length - 1 || currentStudentIndex === -1}
                title="Next Student"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={() => window.print()}
              disabled={!reportData}
              className="gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Download PDF</span>
            </Button>
          </div>
        </div>

        {/* ─── LOADING STATE ─── */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
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
          <div className="space-y-6">
            {/* ─── SUMMARY CARDS ROW (Hidden in Print) ─── */}
            <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-card/50 backdrop-blur-xs">
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground font-medium">Exams Taken</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalExams}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Recorded months</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-xs">
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground font-medium">Average Score</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.avgPercentage}%
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Overall percentage</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-xs">
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground font-medium">Best Score</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {stats.highestPercentage}%
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{stats.bestMonth}</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-xs">
                <CardContent className="p-3.5 sm:p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground font-medium">Group & Class</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold truncate">
                    Group {reportData.student.group_id || '—'}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {reportData.student.class ? `Class ${reportData.student.class}` : 'No Class'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ─── TABS: REPORT CARD vs MONTHLY MARKS HISTORY (Hidden in Print) ─── */}
            <div className="no-print flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'card' | 'history')} className="w-full">
                <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                  <TabsTrigger value="card" className="gap-1.5 cursor-pointer">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Official Report Card</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-1.5 cursor-pointer">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Monthly Marks History</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* ─── TAB 1: OFFICIAL REPORT CARD (PRINTABLE) ─── */}
            <div className={activeTab === 'card' ? 'block' : 'hidden print:block'}>
              <div className="printable-report max-w-4xl mx-auto bg-white text-black font-sans border-[2.5px] border-black rounded-lg p-5 sm:p-7 shadow-sm space-y-4">
                {/* Header Block with Logo & Official Branding */}
                <div className="flex items-center gap-4 pb-2">
                  {/* Logo */}
                  <div className="shrink-0 flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="EnglishJibi"
                      className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-full shadow-xs border border-gray-300"
                    />
                  </div>

                  {/* Institution Details */}
                  <div className="flex-1 text-center pr-4">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight uppercase font-sans">
                      <span className="text-black">ENGLISH</span>
                      <span className="text-red-600">JIBI</span>{' '}
                      <span className="text-black">CLASSES</span>
                    </h1>
                    <p className="text-xs sm:text-sm italic font-semibold text-gray-800 tracking-wide mt-0.5">
                      Your Child, Our Responsibility
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-700 font-medium mt-0.5">
                      {reportData.settings.address || 'Duplex - 37, In front of DAV School, Sailashree Vihar, BBSR.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] sm:text-[11px] font-semibold text-sky-700 pt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Send className="h-3 w-3 text-sky-500 fill-sky-500" />
                        {reportData.settings.instagram || '@englishwithchiranjibisir'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sky-800">
                        <Phone className="h-3 w-3 text-sky-600" />
                        {reportData.settings.phone1 || '+91 83289 22917'} / {reportData.settings.phone2 || '+91 7735812335'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Red Separator Line */}
                <div className="h-1 bg-red-600 w-full" />

                {/* Academic Session & Sub-Title */}
                <div className="text-center pt-1 pb-1 space-y-0.5">
                  <h2 className="text-xs sm:text-sm font-black uppercase text-amber-700 tracking-wider">
                    ACADEMIC SESSION: {academicSession}
                  </h2>
                  <div className="text-[11px] sm:text-xs font-bold text-gray-800">
                    Report Card
                  </div>
                  <div className="text-xs font-bold text-black underline underline-offset-2 pt-0.5">
                    Student's Profile
                  </div>
                </div>

                {/* Student Profile Info Grid (Aligned with Colons) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs font-semibold py-1 px-1 border-b border-gray-300 pb-2">
                  {/* Left Column */}
                  <div className="space-y-1">
                    <div className="flex">
                      <span className="w-36 text-gray-800 uppercase font-bold text-[11px]">STUDENT ID</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono font-bold text-black">{reportData.student.id}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-gray-800 uppercase font-bold text-[11px]">STUDENT NAME</span>
                      <span className="mr-1">:</span>
                      <span className="font-bold text-black">{reportData.student.name}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-gray-800 uppercase font-bold text-[11px]">FATHER'S CONTACT</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono text-gray-900">{reportData.student.father_no || 'NIL'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-gray-800 uppercase font-bold text-[11px]">MOTHER'S CONTACT</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono text-gray-900">{reportData.student.mother_no || 'NIL'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-gray-800 uppercase font-bold text-[11px]">PERSONAL CONTACT</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono text-gray-900">{reportData.student.contact_no || 'NIL'}</span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-1">
                    <div className="flex">
                      <span className="w-36 text-gray-800 uppercase font-bold text-[11px]">CLASS</span>
                      <span className="mr-1">:</span>
                      <span className="font-bold text-black">{reportData.student.class || 'NIL'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-gray-800 uppercase font-bold text-[11px]">SCHOOL</span>
                      <span className="mr-1">:</span>
                      <span className="font-bold text-black">{reportData.student.school || 'NIL'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-gray-800 uppercase font-bold text-[11px]">ADMISSION DATE</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono text-gray-900">{formatReportDate(reportData.student.adm_date)}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-gray-800 uppercase font-bold text-[11px]">DATE OF BIRTH</span>
                      <span className="mr-1">:</span>
                      <span className="font-mono text-gray-900">{formatReportDate(reportData.student.dob)}</span>
                    </div>
                    <div className="flex">
                      <span className="w-36 text-gray-800 uppercase font-bold text-[11px]">TUITION GROUP</span>
                      <span className="mr-1">:</span>
                      <span className="font-bold text-black">{reportData.student.group_id || 'NIL'}</span>
                    </div>
                  </div>
                </div>

                {/* Section Heading: RESULT SUMMARY */}
                <div className="text-center pt-1 pb-1">
                  <h3 className="text-xs sm:text-sm font-black uppercase text-amber-700 tracking-wider underline underline-offset-2">
                    RESULT SUMMARY
                  </h3>
                </div>

                {/* Performance Matrix Table (All 12 Months) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse border-[1.5px] border-black text-xs">
                    <thead className="bg-gray-100 font-bold border-b-[1.5px] border-black text-black">
                      <tr>
                        <th className="p-1.5 sm:p-2 border border-black font-black uppercase w-28 text-left pl-3">
                          MONTH
                        </th>
                        {subjectsList.map((subName) => (
                          <th key={subName} className="p-1.5 sm:p-2 border border-black font-bold uppercase min-w-[70px]">
                            {subName}
                          </th>
                        ))}
                        <th className="p-1.5 sm:p-2 border border-black font-bold uppercase w-16">
                          Total
                        </th>
                        <th className="p-1.5 sm:p-2 border border-black font-bold uppercase w-12">
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
                        const marksMap = new Map<string, { obt: number | null; max: number }>();
                        if (monthResult && monthResult.marks) {
                          monthResult.marks.forEach((mk) => {
                            marksMap.set(mk.subject_name.toLowerCase(), {
                              obt: mk.obtained_marks,
                              max: mk.max_marks,
                            });
                          });
                        }

                        return (
                          <tr key={mCode} className="h-7 hover:bg-gray-50/50">
                            {/* Month Column */}
                            <td className="p-1 sm:p-1.5 border border-black font-bold uppercase text-left pl-3 text-black">
                              {monthName}
                            </td>

                            {/* Subject Marks Columns */}
                            {subjectsList.map((subName) => {
                              const mk = marksMap.get(subName.toLowerCase());

                              if (!monthResult) {
                                return <td key={subName} className="p-1 border border-black" />;
                              }

                              if (isAbsent) {
                                return (
                                  <td key={subName} className="p-1 border border-black font-bold text-red-600">
                                    A
                                  </td>
                                );
                              }

                              if (!mk || mk.obt === null) {
                                return <td key={subName} className="p-1 border border-black" />;
                              }

                              return (
                                <td key={subName} className="p-1 border border-black font-mono font-semibold text-black">
                                  {mk.obt} / {mk.max}
                                </td>
                              );
                            })}

                            {/* Total Column */}
                            <td className="p-1 border border-black font-mono font-bold text-black">
                              {monthResult
                                ? isAbsent
                                  ? 'A'
                                  : monthResult.total_obtained !== null
                                  ? `${monthResult.total_obtained} / ${monthResult.total_max}`
                                  : ''
                                : ''}
                            </td>

                            {/* Percentage Column */}
                            <td className="p-1 border border-black font-mono font-bold text-black">
                              {monthResult
                                ? isAbsent
                                  ? '-'
                                  : monthResult.percentage !== null
                                  ? `${Math.round(monthResult.percentage)}%`
                                  : ''
                                : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Feedback Box */}
                <div className="border-[1.5px] border-black rounded-xs overflow-hidden mt-3">
                  <div className="border-b-[1.5px] border-black bg-gray-50 px-3 py-1 font-bold text-xs uppercase w-32 border-r">
                    FEEDBACK
                  </div>
                  <div className="h-16 p-2 text-xs text-gray-600 italic">
                    {/* Comments area */}
                  </div>
                </div>

                {/* Teacher and Parent Signature Block */}
                <div className="pt-6 pb-2 grid grid-cols-2 gap-8 text-xs font-bold text-black">
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono">* {reportData.settings.teacherName || reportData.settings.adminName || 'CHIRANJIBI SIR'}</div>
                    <div className="text-[11px] font-sans font-semibold text-gray-800">Teacher's Signature</div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-[11px] font-mono">*</div>
                    <div className="text-[11px] font-sans font-semibold text-gray-800">Parent's Signature</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── TAB 2: MONTHLY MARKS HISTORY (DETAILED DRILLDOWN) ─── */}
            <div className={activeTab === 'history' ? 'block' : 'hidden'}>
              {reportData.results.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40 text-muted-foreground" />
                  <h3 className="text-base font-semibold mb-1">No Monthly Exam Records Found</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    This student does not have any recorded monthly examination results yet. Monthly exams can be entered in the Monthly Results section.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-1.5"
                    onClick={() => navigate('/reports/monthly')}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Go to Monthly Results</span>
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reportData.results.map((res) => {
                    const isAbsent = res.status === 'Absent';
                    const monthName = MONTH_NAMES[res.month] || res.month;

                    return (
                      <Card key={res.id} className="overflow-hidden border transition-shadow hover:shadow-md">
                        <CardHeader className="bg-muted/30 border-b p-4 sm:px-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-base">
                                {monthName} {res.academic_year}
                              </span>
                              <Badge
                                variant={res.period_status === 'Published' ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                {res.period_status}
                              </Badge>
                              <Badge
                                variant={isAbsent ? 'destructive' : 'outline'}
                                className="text-[10px]"
                              >
                                {res.status}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                              {res.class_rank && (
                                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-bold">
                                  Class Rank #{res.class_rank}
                                </Badge>
                              )}
                              {res.group_rank && (
                                <Badge variant="outline" className="text-xs font-semibold">
                                  Group Rank #{res.group_rank}
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 ml-1"
                                onClick={() => navigate(`/reports/monthly/${res.result_period_id}/marks`)}
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Edit Marks</span>
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 sm:p-6 space-y-4">
                          {/* Total Score & Progress Indicator */}
                          <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-muted/20 border">
                            <div>
                              <div className="text-xs text-muted-foreground font-medium">Total Score</div>
                              <div className="text-lg font-bold font-mono">
                                {isAbsent ? (
                                  <span className="text-destructive font-sans">Absent</span>
                                ) : (
                                  `${res.total_obtained || 0} / ${res.total_max || 0}`
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-muted-foreground font-medium">Percentage</div>
                              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                {isAbsent || res.percentage === null ? '—' : `${Math.round(res.percentage)}%`}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-muted-foreground font-medium">Batch / Group</div>
                              <div className="text-sm font-semibold">
                                Group {res.group_id} {res.group_class ? `(${res.group_class})` : ''}
                              </div>
                            </div>
                          </div>

                          {/* Subject Marks Grid */}
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                              Subject Scores Breakdown
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                              {res.marks.map((mk) => {
                                const obt = mk.obtained_marks;
                                const max = mk.max_marks;
                                const subPercent = obt !== null && max > 0 ? Math.round((obt / max) * 100) : null;

                                return (
                                  <div
                                    key={mk.id}
                                    className="p-3 rounded-lg border bg-card/60 flex flex-col justify-between space-y-2 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-semibold text-xs truncate" title={mk.subject_name}>
                                        {mk.subject_name}
                                      </span>
                                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                                        Max {max}
                                      </Badge>
                                    </div>

                                    <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
                                      <div className="font-mono font-bold text-sm">
                                        {isAbsent ? (
                                          <span className="text-xs text-destructive">Absent</span>
                                        ) : obt !== null ? (
                                          `${obt} / ${max}`
                                        ) : (
                                          <span className="text-xs text-muted-foreground">Not Marked</span>
                                        )}
                                      </div>
                                      {subPercent !== null && !isAbsent && (
                                        <span className="text-[11px] font-bold text-muted-foreground font-mono">
                                          {subPercent}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
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
