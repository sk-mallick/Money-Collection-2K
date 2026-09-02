import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Filter,
} from 'lucide-react';

// Academic session month sequence (April to March)
const SESSION_MONTHS = [
  'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'
] as const;

export default function StudentReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  
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
        } else if (students.length > 0) {
          setSelectedStudentId(students[0].id);
        }
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setInitialLoading(false);
      }
    }
    load();
  }, [searchParams]);

  // Load report data
  const loadReport = useCallback(async (sId: string) => {
    if (!sId) return;
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
    }
  }, [selectedStudentId, loadReport]);

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setSearchParams({ studentId: id });
  };

  // Filter student list for selector
  const filteredStudents = useMemo(() => {
    return studentsList.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.class && s.class.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGroup = filterGroup === 'all' || s.group === filterGroup;
      const matchesClass = filterClass === 'all' || s.class === filterClass;

      return matchesSearch && matchesGroup && matchesClass;
    });
  }, [studentsList, searchQuery, filterGroup, filterClass]);

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(studentsList.map((s) => s.class).filter(Boolean))).sort();
  }, [studentsList]);

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

  return (
    <div className="page-enter p-4 sm:p-6 space-y-6 w-full">
      {/* ─── TOP CONTROL BAR (HIDDEN IN PRINT) ─── */}
      <div className="no-print space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Student Report Card & Academic Profile
            </h1>
            <p className="text-xs text-muted-foreground">
              Official monthly examination progress report
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              disabled={!reportData}
              className="text-xs h-8 bg-primary"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Report Card
            </Button>
          </div>
        </div>

        {/* Search & Student Picker Toolbar */}
        <Card className="border shadow-xs">
          <CardContent className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Search by Name/ID */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              {/* Group Filter */}
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      Group {g.id} ({g.class})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Class Filter */}
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {uniqueClasses.map((c) => (
                    <SelectItem key={c} value={c}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Student Selector Dropdown */}
              <Select value={selectedStudentId} onValueChange={handleSelectStudent}>
                <SelectTrigger className="text-xs h-8 font-semibold bg-accent/40">
                  <SelectValue placeholder="Select Student" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {filteredStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-semibold">{s.name}</span>{' '}
                      <span className="text-muted-foreground text-[11px]">
                        ({s.id} · {s.class || 'No Class'})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── MAIN REPORT CARD (MATCHING USER ATTACHED SPEC) ─── */}
      {loading || initialLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : !reportData ? (
        <Card className="p-8 text-center text-muted-foreground">
          <UserRound className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Please select a student to display their report card.</p>
        </Card>
      ) : (
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
              {/* Optional comments area */}
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
      )}
    </div>
  );
}
